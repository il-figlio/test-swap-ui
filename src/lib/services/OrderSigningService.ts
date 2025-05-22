import { Signer, TypedDataDomain, TypedDataField } from 'ethers';
import { parseUnits } from 'viem';

// Types matching the Rust structs
export interface Order {
  inputs: Input[];
  outputs: Output[];
  deadline: bigint;
}

export interface Input {
  token: string;
  amount: bigint;
}

export interface Output {
  token: string;
  amount: bigint;
  recipient: string;
  chainId: number;
}

export interface TokenPermissions {
  token: string;
  amount: bigint;
}

export interface PermitBatchTransferFrom {
  permitted: TokenPermissions[];
  nonce: bigint;
  deadline: bigint;
}

export interface Permit2Batch {
  permit: PermitBatchTransferFrom;
  owner: string;
  signature: string;
}

export interface SignedOrder {
  permit: Permit2Batch;
  outputs: Output[];
}

// EIP-712 types for Permit2 (matching Uniswap's Permit2 contract)
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// EIP-712 domain for Permit2
const getPermit2Domain = (chainId: number): TypedDataDomain => ({
  name: "Permit2",
  chainId,
  verifyingContract: PERMIT2_ADDRESS,
});

// EIP-712 types for PermitBatchWitnessTransferFrom
const PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES: Record<string, TypedDataField[]> = {
  PermitBatchWitnessTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions[]' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'outputs', type: 'Output[]' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  Output: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
    { name: 'chainId', type: 'uint32' },
  ],
};

// Helper function to convert BigInt to string for JSON serialization
function serializeBigInts(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = serializeBigInts(obj[key]);
      }
    }
    return result;
  }
  return obj;
}

export class OrderSigningService {
  private signer: Signer;

  constructor(signer: Signer) {
    this.signer = signer;
  }

  /**
   * Create an example order (matching the Rust example)
   * Swaps 1 USDC on rollup for 1 USDC on host
   */
  createExampleOrder(
    rollupUsdcAddress: string,
    hostUsdcAddress: string,
    hostChainId: number,
    recipientAddress: string
  ): Order {
    const ONE_USDC = parseUnits("1", 6); // 1 USDC with 6 decimals

    // Input is 1 USDC on the rollup
    const input: Input = {
      token: rollupUsdcAddress,
      amount: ONE_USDC,
    };

    // Output is 1 USDC on the host chain
    const output: Output = {
      token: hostUsdcAddress,
      amount: ONE_USDC,
      chainId: hostChainId,
      recipient: recipientAddress,
    };

    // Deadline 60 seconds from now (matching Rust example)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    return {
      inputs: [input],
      outputs: [output],
      deadline,
    };
  }

  /**
   * Sign an order using proper EIP-712 permit2 semantics
   * This matches the Rust signing logic
   */
  async signOrder(
    order: Order,
    rollupChainId: number,
    rollupOrderContract: string,
    nonce?: bigint
  ): Promise<SignedOrder> {
    const signerAddress = await this.signer.getAddress();
    
    // Use current time in microseconds as nonce if not provided (matching Rust)
    const permit2Nonce = nonce || BigInt(Date.now() * 1000);
    
    // Convert inputs to permitted tokens
    const permitted: TokenPermissions[] = order.inputs.map(input => ({
      token: input.token,
      amount: input.amount,
    }));

    // Create the permit batch witness transfer from structure
    const permitBatchWitnessTransferFrom = {
      permitted,
      spender: rollupOrderContract,
      nonce: permit2Nonce,
      deadline: order.deadline,
      outputs: order.outputs,
    };

    // Get EIP-712 domain
    const domain = getPermit2Domain(rollupChainId);

    // Sign using EIP-712
    const signature = await this.signer.signTypedData(
      domain,
      PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES,
      permitBatchWitnessTransferFrom
    );

    // Create the signed order
    const signedOrder: SignedOrder = {
      permit: {
        permit: {
          permitted,
          nonce: permit2Nonce,
          deadline: order.deadline,
        },
        owner: signerAddress,
        signature,
      },
      outputs: order.outputs,
    };

    return signedOrder;
  }

  /**
   * Send a signed order to the transaction cache
   * Matches the Rust client.forward_order implementation
   */
  async sendOrderToTxCache(signedOrder: SignedOrder, txCacheUrl: string): Promise<void> {
    // Convert BigInt values to strings for JSON serialization
    const serializedOrder = serializeBigInts(signedOrder);
    
    console.log('Sending order to cache:', serializedOrder);
    
    const response = await fetch(`${txCacheUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serializedOrder),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send order to tx cache: ${response.status} ${errorText}`);
    }

    console.log('Order successfully sent to transaction cache');
    // The Rust code returns `()` for success, so we just return void
  }

  /**
   * Complete flow: create, sign, and send an order
   * Matches the Rust example's run() method
   */
  async createSignAndSendOrder(
    rollupUsdcAddress: string,
    hostUsdcAddress: string,
    rollupChainId: number,
    hostChainId: number,
    rollupOrderContract: string,
    txCacheUrl: string,
    recipientAddress?: string
  ): Promise<void> {
    // Use signer address as recipient if not provided
    const recipient = recipientAddress || await this.signer.getAddress();

    // Create the order
    const order = this.createExampleOrder(
      rollupUsdcAddress,
      hostUsdcAddress,
      hostChainId,
      recipient
    );

    console.log('Created order:', order);

    // Sign the order
    const signedOrder = await this.signOrder(
      order,
      rollupChainId,
      rollupOrderContract
    );

    console.log('Signed order:', signedOrder);

    // Send to transaction cache
    await this.sendOrderToTxCache(signedOrder, txCacheUrl);

    console.log('Order sent to transaction cache successfully');
  }
}

/**
 * Utility function to create and use the service (matching Rust patterns)
 */
export async function createAndSendExampleOrder(
  signer: Signer,
  constants: {
    rollupUsdcAddress: string;
    hostUsdcAddress: string;
    rollupChainId: number;
    hostChainId: number;
    rollupOrderContract: string;
    txCacheUrl: string;
  }
): Promise<void> {
  const orderService = new OrderSigningService(signer);
  
  await orderService.createSignAndSendOrder(
    constants.rollupUsdcAddress,
    constants.hostUsdcAddress,
    constants.rollupChainId,
    constants.hostChainId,
    constants.rollupOrderContract,
    constants.txCacheUrl
  );
}