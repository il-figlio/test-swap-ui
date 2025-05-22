import { Address, TransactionReceipt } from 'viem';
import { TransactionReceipt as EthersTransactionReceipt } from "ethers";

// Order types for Signet
export interface OrderInput {
  token: string;
  amount: bigint;
}

export interface OrderOutput {
  token: string;
  amount: bigint;
  recipient: string;
  chainId: number;
}

export interface Order {
  inputs: OrderInput[];
  outputs: OrderOutput[];
  deadline: bigint;
}

export interface SignedOrder {
  permit: Permit2Batch;
  outputs: OrderOutput[];
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

export enum OrderStatus {
  CREATED = 'created',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

// Bundle types for Signet
export interface Bundle {
  transactions: string[];
  blockNumber: number;
  status: BundleStatus;
  bundleId?: string;
}

export enum BundleStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED'
}

// Swap types
export interface SwapInput {
  sourceChainId: number;
  targetChainId: number;
  sourceToken: string;
  targetToken: string;
  amount: bigint;
  targetAmount: bigint;
  sender: string;
  recipient: string;
}

export interface SwapState {
  status: SwapStatus;
  error?: string;
  txHash?: string;
  transactionHash?: string;
  receipt?: EthersTransactionReceipt;
  bundleId?: string;
}

export enum SwapStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  CREATING_ORDER = 'CREATING_ORDER',
  WAITING_FOR_CONFIRMATION = 'WAITING_FOR_CONFIRMATION',
  ORDER_CREATED = 'ORDER_CREATED',
  SIMULATING_BUNDLE = 'SIMULATING_BUNDLE',
  BUNDLE_SIMULATED = 'BUNDLE_SIMULATED',
  SENDING_BUNDLE = 'SENDING_BUNDLE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
} 