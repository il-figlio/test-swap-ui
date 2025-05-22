import { 
  SignedOrder, 
  Permit2Batch, 
  Output 
} from '../types/signet';
import { 
  TxCacheBundle,
  SignetEthBundle,
  SignedFill,
  EthSendBundle,
  TxCacheBundleResponse,
  TxCacheBundlesResponse,
  TxCacheSendBundleResponse,
  TxCacheTransactionsResponse,
  TxCacheSendTransactionResponse,
  TxCacheOrdersResponse
} from '../types/txcache';

export class TxCacheClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Create a client for the Pecorino testnet
   */
  static pecorino(): TxCacheClient {
    return new TxCacheClient('https://transactions.pecorino.signet.sh');
  }

  /**
   * Forward a raw transaction to the cache
   */
  async forwardRawTransaction(tx: any): Promise<TxCacheSendTransactionResponse> {
    return this.postJson('/transactions', tx);
  }

  /**
   * Forward a bundle to the cache
   */
  async forwardBundle(bundle: SignetEthBundle): Promise<TxCacheSendBundleResponse> {
    return this.postJson('/bundles', bundle);
  }

  /**
   * Forward an order to the cache (matching Rust forward_order)
   */
  async forwardOrder(order: SignedOrder): Promise<void> {
    await this.postJson('/orders', order);
    // Rust version returns (), so we return void
  }

  /**
   * Get transactions from the cache
   */
  async getTransactions(): Promise<any[]> {
    const response: TxCacheTransactionsResponse = await this.getJson('/transactions');
    return response.transactions;
  }

  /**
   * Get bundles from the cache
   */
  async getBundles(): Promise<TxCacheBundle[]> {
    const response: TxCacheBundlesResponse = await this.getJson('/bundles');
    return response.bundles;
  }

  /**
   * Get a single bundle from the cache
   */
  async getBundle(): Promise<TxCacheBundle> {
    const response: TxCacheBundleResponse = await this.getJson('/bundles');
    return response.bundle;
  }

  /**
   * Get signed orders from the cache
   */
  async getOrders(): Promise<SignedOrder[]> {
    const response: TxCacheOrdersResponse = await this.getJson('/orders');
    return response.orders;
  }

  /**
   * Generic POST helper
   */
  private async postJson<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to POST to ${endpoint}: ${response.status} ${errorText}`);
      }

      // Handle empty responses (like the Rust forward_order that returns ())
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0' || contentLength === null) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to POST to ${endpoint}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generic GET helper
   */
  private async getJson<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to GET from ${endpoint}: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to GET from ${endpoint}: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Convenience functions that match the Rust TxCache usage patterns
 */

/**
 * Create a Pecorino transaction cache client
 */
export function createPecorinoTxCache(): TxCacheClient {
  return TxCacheClient.pecorino();
}

/**
 * Send an order to the Pecorino transaction cache
 */
export async function sendOrderToPecorino(order: SignedOrder): Promise<void> {
  const txCache = createPecorinoTxCache();
  await txCache.forwardOrder(order);
}

/**
 * Get all available orders from Pecorino transaction cache
 */
export async function getOrdersFromPecorino(): Promise<SignedOrder[]> {
  const txCache = createPecorinoTxCache();
  return await txCache.getOrders();
}

/**
 * Send a bundle to the Pecorino transaction cache
 */
export async function sendBundleToPecorino(bundle: SignetEthBundle): Promise<TxCacheSendBundleResponse> {
  const txCache = createPecorinoTxCache();
  return await txCache.forwardBundle(bundle);
}