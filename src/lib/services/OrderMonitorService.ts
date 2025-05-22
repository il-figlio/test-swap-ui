import { JsonRpcProvider, BrowserProvider, Contract } from 'ethers';
import { SignedOrder, Output } from '../types/signet';
import { TxCacheClient } from './TxCacheClient';
import { 
  CONTRACT_ADDRESSES, 
  PECORINO_HOST_CHAIN_ID, 
  PECORINO_SIGNET_CHAIN_ID, 
  getOrdersContract 
} from '../constants/contracts';
import OrdersABI from '../abi/Orders.json';

export interface OrderStatusUpdate {
  orderId: string;
  status: 'PENDING' | 'FILLED' | 'EXPIRED' | 'FAILED';
  timestamp: number;
  details?: SignedOrder | any;
}

export interface OrderMonitorOptions {
  pollInterval?: number;
  maxRetries?: number;
}

export class OrderMonitorService {
  private provider: JsonRpcProvider | BrowserProvider;
  private txCacheClient: TxCacheClient;
  private ordersContract: Contract;
  private chainId: number;
  private listeners: Map<string, (update: OrderStatusUpdate) => void> = new Map();
  private activeMonitoredOrders: Set<string> = new Set();

  constructor(
    provider: JsonRpcProvider | BrowserProvider, 
    chainId?: number,
    options: OrderMonitorOptions = {}
  ) {
    this.provider = provider;
    this.txCacheClient = TxCacheClient.pecorino();
    
    // Determine chain ID
    this.chainId = chainId || 
      (provider instanceof BrowserProvider 
        ? PECORINO_SIGNET_CHAIN_ID 
        : PECORINO_HOST_CHAIN_ID);
    
    // Get the correct orders contract address for the chain
    const ordersContractAddress = getOrdersContract(this.chainId);

    // Initialize Orders contract
    this.ordersContract = new Contract(
      ordersContractAddress, 
      OrdersABI, 
      provider
    );
  }

  /**
   * Fetch recent orders from the transaction cache
   */
  async getRecentOrders(limit: number = 20): Promise<SignedOrder[]> {
    const orders = await this.txCacheClient.getOrders();
    return orders.slice(0, limit);
  }

  /**
   * Monitor a specific order's status
   * @param signedOrder - The signed order to monitor
   * @param callback - Function to call when order status changes
   */
  async monitorOrder(
    signedOrder: SignedOrder, 
    callback: (update: OrderStatusUpdate) => void
  ): Promise<void> {
    const orderId = this.generateOrderId(signedOrder);
    
    // Prevent duplicate monitoring
    if (this.activeMonitoredOrders.has(orderId)) {
      console.warn(`Already monitoring order ${orderId}`);
      return;
    }

    this.activeMonitoredOrders.add(orderId);
    this.listeners.set(orderId, callback);

    // Start monitoring
    await this.startOrderTracking(signedOrder, orderId);
  }

  /**
   * Generate a unique order ID based on the signed order's details
   */
  private generateOrderId(signedOrder: SignedOrder): string {
    // Create a unique identifier based on signature and outputs
    const signatureHash = this.hashSignature(signedOrder.permit.signature);
    const outputsHash = this.hashOutputs(signedOrder.outputs);
    return `${signatureHash}-${outputsHash}`;
  }

  /**
   * Internal method to start tracking an order
   */
  private async startOrderTracking(
    signedOrder: SignedOrder, 
    orderId: string
  ): Promise<void> {
    const checkOrderStatus = async () => {
      try {
        // Check if order is filled
        const isFilled = await this.checkOrderFilled(signedOrder);
        
        const update: OrderStatusUpdate = {
          orderId,
          status: isFilled ? 'FILLED' : 'PENDING',
          timestamp: Date.now(),
          details: signedOrder
        };

        // Notify listener
        const listener = this.listeners.get(orderId);
        if (listener) {
          listener(update);
        }

        // Stop monitoring if filled
        if (isFilled) {
          this.stopMonitoringOrder(orderId);
        }
      } catch (error) {
        console.error(`Error monitoring order ${orderId}:`, error);
        
        const errorUpdate: OrderStatusUpdate = {
          orderId,
          status: 'FAILED',
          timestamp: Date.now(),
          details: error instanceof Error ? error : new Error(String(error))
        };

        const listener = this.listeners.get(orderId);
        if (listener) {
          listener(errorUpdate);
        }

        this.stopMonitoringOrder(orderId);
      }
    };

    // Initial check
    await checkOrderStatus();

    // Set up periodic checking
    const intervalId = setInterval(
      checkOrderStatus, 
      30000 // Check every 30 seconds
    );

    // Store interval to allow stopping
    (this.activeMonitoredOrders as any)[orderId] = intervalId;
  }

  /**
   * Check if an order has been filled on-chain
   */
  private async checkOrderFilled(signedOrder: SignedOrder): Promise<boolean> {
    try {
      // Adjust filter to match the contract's Filled event signature
      const filter = this.ordersContract.filters.Filled();
      
      // If the contract expects a specific event signature, you might need to adjust this
      const events = await this.ordersContract.queryFilter(
        filter, 
        // Optionally specify block range
        // You might want to limit the block range to recent blocks
      );

      // Check if any events match the order's outputs
      return events.some(event => {
        // This is a placeholder - you'll need to implement the actual matching logic
        // based on your specific contract's Filled event structure
        return true;
      });
    } catch (error) {
      console.error('Error checking order fill status:', error);
      return false;
    }
  }

  /**
   * Stop monitoring a specific order
   */
  stopMonitoringOrder(orderId: string): void {
    // Clear interval
    const intervalId = (this.activeMonitoredOrders as any)[orderId];
    if (intervalId) {
      clearInterval(intervalId);
    }

    // Remove from active monitored orders
    this.activeMonitoredOrders.delete(orderId);
    this.listeners.delete(orderId);
  }

  /**
   * Stop monitoring all orders
   */
  stopAllMonitoring(): void {
    this.activeMonitoredOrders.forEach(orderId => {
      this.stopMonitoringOrder(orderId);
    });
  }

  /**
   * Utility method to create a simple hash of the signature
   */
  private hashSignature(signature: string): string {
    // Simple hash function - in production, use a more robust hashing method
    return signature.slice(0, 10);
  }

  /**
   * Utility method to create a hash of order outputs
   */
  private hashOutputs(outputs: Output[]): string {
    // Create a deterministic string representation of outputs
    return outputs
      .map(output => `${output.token}-${output.amount}-${output.recipient}-${output.chainId}`)
      .join('|')
      .slice(0, 20);
  }

  /**
   * Get all currently monitored order IDs
   */
  getMonitoredOrders(): string[] {
    return Array.from(this.activeMonitoredOrders);
  }
}

/**
 * Convenience function to create an OrderMonitorService
 */
export function createOrderMonitor(
  provider?: JsonRpcProvider | BrowserProvider,
  chainId?: number,
  options: OrderMonitorOptions = {}
): OrderMonitorService {
  // If no provider is passed, attempt to use window.ethereum
  if (!provider && typeof window !== 'undefined' && window.ethereum) {
    provider = new BrowserProvider(window.ethereum);
  }

  if (!provider) {
    throw new Error('No Ethereum provider found. Please provide a provider or ensure MetaMask is installed.');
  }

  return new OrderMonitorService(provider, chainId, options);
}