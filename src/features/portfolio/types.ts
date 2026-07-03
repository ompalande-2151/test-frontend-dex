export type PortfolioTimeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

export type PortfolioTab = "overview" | "tokens" | "activity" | "positions";

export type PortfolioActivityType = "swap" | "send" | "receive" | "approve" | "bridge" | "liquidity";

export type PortfolioActivityStatus = "confirmed" | "pending" | "failed";

export type PortfolioPositionStatus = "In Range" | "Out Of Range" | "Closed";

export interface PortfolioStats {
  totalAssets: number;
  totalNetworks: number;
  totalPositions: number;
  transactions: number;
  portfolioChange24h: number;
  largestHolding: {
    symbol: string;
    valueUsd: number;
    allocation: number;
  };
}

export interface Portfolio {
  address: string;
  portfolioName: string;
  walletLabel: string;
  ensName: string | null;
  valueUsd: number;
  change24h: number;
  networkCount: number;
  assetCount: number;
  isNativeBalance?: boolean;
  nativeSymbol?: string;
  stats: PortfolioStats;
}

export interface PortfolioAsset {
  id: string;
  symbol: string;
  name: string;
  network: string;
  chainId: number;
  priceUsd: number;
  balance: number;
  valueUsd: number;
  change24h: number;
  allocation: number;
  address: string;
}

export interface PortfolioActivity {
  id: string;
  type: PortfolioActivityType;
  asset: string;
  amount: number;
  amountUsd: number;
  network: string;
  hash: string;
  timestamp: number;
  status: PortfolioActivityStatus;
  explorerUrl: string;
}

export interface PortfolioPosition {
  id: string;
  pool: string;
  assets: [string, string];
  network: string;
  liquidityUsd: number;
  apr: number;
  feesEarnedUsd: number;
  status: PortfolioPositionStatus;
  hash: string;
  reserves?: {
    [symbol: string]: number;
  };
}

export interface PortfolioChartPoint {
  time: number;
  value: number;
}

export interface PortfolioServiceArgs {
  walletAddress?: string;
  timeframe?: PortfolioTimeframe;
}
