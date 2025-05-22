import { Address } from 'viem';

// Export chain ID constants
export const PECORINO_HOST_CHAIN_ID = 3151908;
export const PECORINO_SIGNET_CHAIN_ID = 14174;

// Rest of the existing code remains the same
export const CONTRACT_ADDRESSES: Record<number, {
  orders?: Address;
  hostOrders?: Address;
  passage?: Address;
  ruPassage?: Address;
  zenith?: Address;
  transactor?: Address;
  permit2?: Address;
}> = {
  [PECORINO_HOST_CHAIN_ID]: {
    // Host chain contracts
    orders: '0x4E8cC181805aFC307C83298242271142b8e2f249' as Address, // HOST_ORDERS
    passage: '0xd553C4CA4792Af71F4B61231409eaB321c1Dd2Ce' as Address, // HOST_PASSAGE  
    zenith: '0xbe45611502116387211D28cE493D6Fb3d192bc4E' as Address, // HOST_ZENITH
    transactor: '0x1af3A16857C28917Ab2C4c78Be099fF251669200' as Address, // HOST_TRANSACTOR
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as Address, // Standard Permit2
  },
  [PECORINO_SIGNET_CHAIN_ID]: {
    // Rollup chain contracts  
    orders: '0x8e9806fFF56d0660683F0A8157cE70F541A49dD0' as Address, // RU_ORDERS
    ruPassage: '0x862c10E42B7D07dfDE6F74af61B20A55ca5243FE' as Address, // RU_PASSAGE
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as Address, // Standard Permit2
  },
};


// Token addresses for Pecorino testnet
export const TOKEN_ADDRESSES: Record<number, Record<string, Address>> = {
  [PECORINO_HOST_CHAIN_ID]: {
    // Host chain tokens
    usdc: '0x885F8DB528dC8a38aA3DDad9D3F619746B4a6A81' as Address, // HOST_USDC
    usdt: '0x7970D259D4a96764Fa9B23FF0715A35f06f52D1A' as Address, // HOST_USDT  
    wbtc: '0x9aeDED4224f3dD31aD8A0B1FcD05E2d7829283a7' as Address, // HOST_WBTC
  },
  [PECORINO_SIGNET_CHAIN_ID]: {
    // Rollup chain tokens
    usdc: '0x0B8BC5e60EE10957E0d1A0d95598fA63E65605e2' as Address, // RU_USDC
    usdt: '0xF34326d3521F1b07d1aa63729cB14A372f8A737C' as Address, // RU_USDT
    wbtc: '0xE3d7066115f7d6b65F88Dff86288dB4756a7D733' as Address, // RU_WBTC
  },
};

// API endpoints for Signet services
export const API_ENDPOINTS = {
  // Transaction cache for order submission and discovery
  txCache: 'https://transactions.pecorino.signet.sh',
  
  // RPC endpoints for bundle simulation and submission
  hostRpc: 'https://host-rpc.pecorino.signet.sh',
  rollupRpc: 'https://rpc.pecorino.signet.sh/rpc',
  
  // Block explorers
  hostExplorer: 'https://host-explorer.pecorino.signet.sh',
  rollupExplorer: 'https://explorer.pecorino.signet.sh',
};

// Chain configuration constants from the Rust SDK
export const CHAIN_CONFIG = {
  host: {
    chainId: PECORINO_HOST_CHAIN_ID, // 3151908
    name: 'Pecorino Host',
    deployHeight: 149984,
  },
  rollup: {
    chainId: PECORINO_SIGNET_CHAIN_ID, // 14174  
    name: 'Pecorino',
  },
} as const;

// Helper functions for getting contract addresses
export function getOrdersContract(chainId: number): Address {
  const contracts = CONTRACT_ADDRESSES[chainId];
  if (!contracts?.orders) {
    throw new Error(`Orders contract not found for chain ${chainId}`);
  }
  return contracts.orders;
}

export function getPassageContract(chainId: number): Address {
  const contracts = CONTRACT_ADDRESSES[chainId];
  const passage = chainId === PECORINO_HOST_CHAIN_ID ? contracts?.passage : contracts?.ruPassage;
  if (!passage) {
    throw new Error(`Passage contract not found for chain ${chainId}`);
  }
  return passage;
}

export function getPermit2Contract(chainId: number): Address {
  const contracts = CONTRACT_ADDRESSES[chainId];
  if (!contracts?.permit2) {
    throw new Error(`Permit2 contract not found for chain ${chainId}`);
  }
  return contracts.permit2;
}

export function getTokenAddress(chainId: number, symbol: string): Address {
  const tokens = TOKEN_ADDRESSES[chainId];
  if (!tokens) {
    throw new Error(`No tokens found for chain ${chainId}`);
  }
  
  const tokenAddress = tokens[symbol.toLowerCase() as keyof typeof tokens];
  if (!tokenAddress) {
    throw new Error(`Token ${symbol} not found for chain ${chainId}`);
  }
  
  return tokenAddress;
}

// Validation helpers
export function isSupportedChain(chainId: number): boolean {
  return chainId === PECORINO_HOST_CHAIN_ID || chainId === PECORINO_SIGNET_CHAIN_ID;
}

export function isHostChain(chainId: number): boolean {
  return chainId === PECORINO_HOST_CHAIN_ID;
}

export function isRollupChain(chainId: number): boolean {
  return chainId === PECORINO_SIGNET_CHAIN_ID;
}



// Export legacy format for backward compatibility
export { CONTRACT_ADDRESSES as default };