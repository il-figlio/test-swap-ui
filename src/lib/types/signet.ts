import { TransactionReceipt } from "ethers";
import { Address } from "viem";

// Order-related Types (matching OrderSigningService)
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

export interface Order {
  inputs: Input[];
  outputs: Output[];
  deadline: bigint;
}

// For SignetService compatibility
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

// Permit and Signing Types
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

// Swap-related Types
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

export interface SwapState {
  status: SwapStatus;
  error?: string;
  txHash?: string;
  transactionHash?: string;
  receipt?: TransactionReceipt;
  bundleId?: string;
}

export enum BundleStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED'
}

export interface Bundle {
  transactions: string[];
  blockNumber: number;
  status: BundleStatus;
  bundleId?: string;
}