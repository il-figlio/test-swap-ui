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
    // Try multiple sources in order of preference
    const priceFetchers = [
      () => this.fetchFromDefiLlama(token),
      () => this.fetchFromCryptoCompare(token),
      () => this.fetchFromCoinGecko(token),
    ];

    for (const fetcher of priceFetchers) {
      try {
        const price = await fetcher();
        if (price && price > 0) {
          console.log(`Got price for ${token.symbol} from API: $${price}`);
          return price;
        }
      } catch (error) {
        console.warn(`Price fetch failed for ${token.symbol}, trying next source:`, error);
        continue;
      }
    }

    // Return null if all sources fail - let the UI handle it
    console.error(`All price sources failed for ${token.symbol}`);
    return null;
  }

  private static async fetchFromDefiLlama(token: Token): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(
        `https://coins.llama.fi/prices/current/coingecko:${token.coingeckoId}`,
        { signal: controller.signal }
      );
      
      if (!response.ok) throw new Error(`DefiLlama API error: ${response.status}`);
      
      const data = await response.json();
      const key = `coingecko:${token.coingeckoId}`;
      
      if (!data.coins?.[key]?.price) {
        throw new Error('No price data from DefiLlama');
      }
      
      return data.coins[key].price;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static async fetchFromCryptoCompare(token: Token): Promise<number> {
    const symbolMap: Record<string, string> = {
      'ethereum': 'ETH',
      'usd-coin': 'USDC',
      'tether': 'USDT',
      'wrapped-bitcoin': 'WBTC',
    };
    
    const symbol = symbolMap[token.coingeckoId];
    if (!symbol) throw new Error('Symbol not mapped for CryptoCompare');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(
        `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD`,
        { signal: controller.signal }
      );
      
      if (!response.ok) throw new Error(`CryptoCompare API error: ${response.status}`);
      
      const data = await response.json();
      if (!data.USD) throw new Error('No USD price from CryptoCompare');
      
      return data.USD;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static async fetchFromCoinGecko(token: Token): Promise<number> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${token.coingeckoId}&vs_currencies=usd`,
        { signal: controller.signal }
      );
      
      if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
      
      const data = await response.json();
      const price = data[token.coingeckoId]?.usd;
      
      if (!price) throw new Error('No price from CoinGecko');
      
      return price;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
