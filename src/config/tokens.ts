import addresses from "./addresses.json";

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
  address?: string;
  chainId: number;
}

export const TOKENS: Token[] = [
  {
    symbol: "MST",
    name: "tMST Native Token",
    decimals: 18,
    priceUsd: 0,
    chainId: 91562037, // MST Testnet
  },
  {
    symbol: "WMST",
    name: "Wrapped MST",
    decimals: 18,
    priceUsd: 0,
    address: addresses.WMST_ADDRESS,
    chainId: 91562037,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: Number(addresses.USDC_DECIMALS ?? 18),
    priceUsd: 1.0,
    address: addresses.USDC_ADDRESS,
    chainId: 91562037,
  }
];

export function tokensForChain(chainId: number): Token[] {
  return TOKENS.filter((token) => token.chainId === chainId && token.address);
}

