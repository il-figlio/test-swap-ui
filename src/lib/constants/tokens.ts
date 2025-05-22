import { Address } from 'viem';
import { PECORINO_HOST_CHAIN_ID, PECORINO_SIGNET_CHAIN_ID } from './chains';

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  addresses: Record<number, Address>;
  logoURI: string;
  coingeckoId: string;
}

export const NATIVE_TOKEN: Token = {
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
  addresses: {
    [PECORINO_HOST_CHAIN_ID]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    [PECORINO_SIGNET_CHAIN_ID]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  },
  logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  coingeckoId: 'ethereum',
};

export const TOKENS: Token[] = [
  NATIVE_TOKEN,
  {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    addresses: {
      [PECORINO_HOST_CHAIN_ID]: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
      [PECORINO_SIGNET_CHAIN_ID]: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
    },
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    coingeckoId: 'usd-coin',
  },
  {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    addresses: {
      [PECORINO_HOST_CHAIN_ID]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      [PECORINO_SIGNET_CHAIN_ID]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    },
    logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    coingeckoId: 'tether',
  },
  {
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
    addresses: {
      [PECORINO_HOST_CHAIN_ID]: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      [PECORINO_SIGNET_CHAIN_ID]: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    },
    logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    coingeckoId: 'wrapped-bitcoin',
  },
];

// Export as both names for backward compatibility
export const SUPPORTED_TOKENS = TOKENS;

export const getTokenBySymbol = (symbol: string): Token | undefined => {
  return TOKENS.find((token) => token.symbol === symbol);
};

export const getTokenByAddress = (chainId: number, address: string): Token | undefined => {
  return TOKENS.find(
    (token) => token.addresses[chainId]?.toLowerCase() === address.toLowerCase()
  );
};