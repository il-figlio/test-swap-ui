import { 
  SignedOrder, 
  Permit2Batch, 
  Output 
} from './signet';
import { Address } from 'viem';

export interface EthSendBundle {
  txs: string[];
  revertingTxHashes: string[];
  blockNumber: number;
  minTimestamp?: number;
  maxTimestamp?: number;
  replacementUuid?: string;
}

export interface SignedFill {
  permit: Permit2Batch;
  outputs: Output[];
}

export interface SignetEthBundle {
  hostFills?: SignedFill;
  bundle: EthSendBundle;
}

export interface TxCacheBundle {
  id: string;
  bundle: SignetEthBundle;
}

export interface TxCacheBundleResponse {
  bundle: TxCacheBundle;
}

export interface TxCacheBundlesResponse {
  bundles: TxCacheBundle[];
}

export interface TxCacheSendBundleResponse {
  id: string;
}

export interface TxCacheTransactionsResponse {
  transactions: any[]; // TxEnvelope in Rust
}

export interface TxCacheSendTransactionResponse {
  txHash: string;
}

export interface TxCacheOrdersResponse {
  orders: SignedOrder[];
}