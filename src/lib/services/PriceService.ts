import { Token } from '../constants/tokens';

// Use v3 API with a fallback to Pro API if needed
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache prices for 30 seconds
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Fallback prices for when API is completely unavailable
const FALLBACK_PRICES: Record<string, number> = {
  'ethereum': 2000,
  'usd-coin': 1,
  'tether': 1,
  'wrapped-bitcoin': 30000,
};

async function fetchWithRetry(url: string, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, retries - 1, delay * 2);
  }
}

export class PriceService {
  static async getTokenPrice(token: Token): Promise<number | null> {
    try {
      // Check cache first
      const cached = priceCache.get(token.coingeckoId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.price;
      }

      // Try fetching from API with retries
      try {
        const response = await fetchWithRetry(
          `${COINGECKO_API}/simple/price?ids=${token.coingeckoId}&vs_currencies=usd`
        );
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format');
        }

        const data = await response.json();
        
        if (!data || typeof data !== 'object' || !data[token.coingeckoId] || typeof data[token.coingeckoId].usd !== 'number') {
          throw new Error(`Invalid price data structure for token: ${token.symbol}`);
        }

        const price = data[token.coingeckoId].usd;

        if (price <= 0 || !isFinite(price)) {
          throw new Error(`Invalid price value for token: ${token.symbol}`);
        }

        // Update cache
        priceCache.set(token.coingeckoId, {
          price,
          timestamp: Date.now()
        });

        return price;
      } catch (apiError) {
        console.warn(`API fetch failed for ${token.symbol}, using fallback price:`, apiError);
        return FALLBACK_PRICES[token.coingeckoId] ?? 1;
      }
    } catch (error) {
      console.error(`Error fetching price for ${token.symbol}:`, error);
      
      // Return cached price if available, even if expired
      const cached = priceCache.get(token.coingeckoId);
      if (cached) {
        console.warn(`Using stale cached price for ${token.symbol} due to fetch error`);
        return cached.price;
      }
      
      // If no cached price is available, use fallback price
      return FALLBACK_PRICES[token.coingeckoId] ?? 1;
    }
  }
}
