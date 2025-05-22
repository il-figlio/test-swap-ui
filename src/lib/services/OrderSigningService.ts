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
    // Based on the Rust SDK, the SignedOrder structure uses #[serde(flatten)] on permit
    // This means the permit fields should be at the top level, not nested
    const formattedOrder = {
      // Flatten the permit structure
      permit: {
        permitted: signedOrder.permit.permit.permitted.map(p => ({
          token: p.token,
          amount: p.amount.toString()
        })),
        nonce: signedOrder.permit.permit.nonce.toString(),
        deadline: signedOrder.permit.permit.deadline.toString()
      },
      owner: signedOrder.permit.owner,
      signature: signedOrder.permit.signature,
      outputs: signedOrder.outputs.map(o => ({
        token: o.token,
        amount: o.amount.toString(),
        recipient: o.recipient,
        chainId: o.chainId
      }))
    };
    
    console.log('Sending order to cache:', JSON.stringify(formattedOrder, null, 2));
    
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
        body: JSON.stringify(formattedOrder),
      });
  
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }
  
      if (!response.ok) {
        // Check for specific error messages
        if (response.status === 500 && responseText.includes("Internal Server Error")) {
          // The transaction cache might be having issues or the signature validation is failing
          throw new Error(`Transaction cache service error. The order may be incorrectly formatted or the service is temporarily unavailable.`);
        }
        const errorDetails = responseData.details || responseData.error || responseData.message || '';
        throw new Error(`Transaction cache error: ${response.status} ${errorDetails}`);
      }
      
      console.log('Order successfully sent to transaction cache');
    } catch (error) {
      console.error('Transaction cache error:', error);
      throw error;
    }
  }
}