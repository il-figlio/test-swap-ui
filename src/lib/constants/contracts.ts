import { Address } from 'viem';
import { PECORINO_HOST_CHAIN_ID, PECORINO_SIGNET_CHAIN_ID } from './chains';

// Contract addresses for Signet services
export const CONTRACT_ADDRESSES: Record<number, {
  passage?: Address;
  transactor?: Address;
  orders?: Address;
  permit2?: Address;
  zenith?: Address;
}> = {
  [PECORINO_HOST_CHAIN_ID]: {
    passage: '0x4200000000000000000000000000000000000015',
    transactor: '0x4200000000000000000000000000000000000016',
    orders: '0x4200000000000000000000000000000000000017',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    zenith: '0x4200000000000000000000000000000000000018',
  },
  [PECORINO_SIGNET_CHAIN_ID]: {
    passage: '0x4200000000000000000000000000000000000015',
    transactor: '0x4200000000000000000000000000000000000016',
    orders: '0x4200000000000000000000000000000000000017',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    zenith: '0x4200000000000000000000000000000000000018',
  },
};

// API endpoints for order cache and other services
export const API_ENDPOINTS = {
  orderCache: 'https://api.pecorino.signet.sh/orders',
  simulateBundle: 'https://rpc.pecorino.signet.sh/rpc',
  sendBundle: 'https://rpc.pecorino.signet.sh/rpc',
}; 