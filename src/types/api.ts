export interface Pool {
  _id: string;
  poolAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  token0InitialAmount: string;
  token1InitialAmount: string;
  currentToken0Amount: string;
  currentToken1Amount: string;
  creatorWallet: string;
  txHash: string;
  chainId: number;
  feeTier: number;
  protocol: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoolDto {
  poolAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  creatorWallet: string;
  txHash: string;
  chainId: number;
  feeTier: number;
  token0Decimals: number;
  token1Decimals: number;
  token0InitialAmount: string;
  token1InitialAmount: string;
  protocol?: string;
}

export interface Swap {
  _id: string;
  walletAddress: string;
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  txHash: string;
  chainId: number;
  price: number;
  createdAt: string;
}

export interface CreateSwapDto {
  walletAddress: string;
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  txHash: string;
  chainId: number;
  price: number;
}

export interface Token {
  _id: string;
  tokenAddress: string;
  symbol: string;
  decimals: number;
  chainId: number;
  firstPoolAddress: string;
  price: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketData {
  tokenAddress: string;
  symbol: string;
  chainId: number;
  price: number;
  change24h: number;
  fdv: number;
  volume24h: number;
  marketCap: number;
  image: string;
}

export interface OHLCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ActivityType = "POOL_CREATED" | "SWAP" | "ADD_LIQUIDITY" | "REMOVE_LIQUIDITY" | "swap" | "add-liquidity" | "remove-liquidity";

export interface Activity {
  _id: string;
  type: ActivityType;
  poolAddress: string;
  walletAddress: string;
  txHash: string;
  createdAt: string;
  // Specific fields based on type:
  // Swap specific
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  price?: number;
  // Liquidity specific
  token0Amount?: string;
  token1Amount?: string;
}

export interface CreateLiquidityDto {
  poolAddress: string;
  walletAddress: string;
  token0Amount: string;
  token1Amount: string;
  txHash: string;
  chainId: number;
}
