import type { Chain } from 'viem';

export const PECORINO_HOST_CHAIN_ID = 3151908;
export const PECORINO_SIGNET_CHAIN_ID = 14174;

export const pecorinoHost: Chain = {
  id: PECORINO_HOST_CHAIN_ID,
  name: 'Pecorino Host',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://host-rpc.pecorino.signet.sh/'],
    },
    public: {
      http: ['https://host-rpc.pecorino.signet.sh/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Pecorino Host Explorer',
      url: 'https://host-explorer.pecorino.signet.sh/',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
  testnet: true,
};

export const pecorinoSignet: Chain = {
  id: PECORINO_SIGNET_CHAIN_ID,
  name: 'Pecorino Signet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.pecorino.signet.sh/rpc'],
    },
    public: {
      http: ['https://rpc.pecorino.signet.sh/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Pecorino Signet Explorer',
      url: 'https://explorer.pecorino.signet.sh/',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
  testnet: true,
};

export const SUPPORTED_CHAINS = [pecorinoHost, pecorinoSignet];
