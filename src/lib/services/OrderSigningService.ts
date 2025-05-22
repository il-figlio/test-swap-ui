import { Signer, TypedDataDomain, TypedDataField } from 'ethers';
import { parseUnits } from 'viem';
import { Order, SignedOrder, TokenPermissions, Output } from '../types/signet';

export type { Order, SignedOrder, TokenPermissions, Output } from '../types/signet';

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const getPermit2Domain = (chainId: number): TypedDataDomain => ({
  name: "Permit2",
  chainId,
  verifyingContract: PERMIT2_ADDRESS,
});

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

  async signOrder(
    order: Order,
    rollupChainId: number,
    rollupOrderContract: string,
    nonce?: bigint
  ): Promise<SignedOrder> {
    const signerAddress = await this.signer.getAddress();
    const permit2Nonce = nonce || BigInt(Date.now() * 1000);
    
    const permitted: TokenPermissions[] = order.inputs.map(input => ({
      token: input.token,
      amount: input.amount,
    }));

    const permitBatchWitnessTransferFrom = {
      permitted,
      spender: rollupOrderContract,
      nonce: permit2Nonce,
      deadline: order.deadline,
      outputs: order.outputs,
    };

    const domain = getPermit2Domain(rollupChainId);

    const signature = await this.signer.signTypedData(
      domain,
      PERMIT_BATCH_WITNESS_TRANSFER_FROM_TYPES,
      permitBatchWitnessTransferFrom
    );

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

  async sendOrderToTxCache(signedOrder: SignedOrder, txCacheUrl: string): Promise<void> {
    const serializedOrder = serializeBigInts(signedOrder);
    
    console.log('Sending order to cache:', JSON.stringify(serializedOrder, null, 2));
    
    try {
      // Use API route in production to avoid CORS
      const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost';
      const url = isProduction ? '/api/tx-cache' : `${txCacheUrl}/orders`;
      
      console.log('Using URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(serializedOrder),
      });
  
      const responseData = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', responseData);
  
      if (!response.ok) {
        const errorDetails = responseData.details ? JSON.stringify(responseData.details) : '';
        throw new Error(`${responseData.error || 'Failed to send order'}: ${response.status} ${errorDetails}`);
      }
    } catch (error) {
      console.error('Transaction cache error:', error);
      throw error;
    }
  }
}