import { TOKENS } from "@/config/tokens";
import type {
  Portfolio,
  PortfolioActivity,
  PortfolioAsset,
  PortfolioChartPoint,
  PortfolioPosition,
  PortfolioTimeframe,
} from "../types";

const WALLET_ADDRESS = "0xA7B4c1d2E3f4567890AbCDef1234567890abF31";

function makeHash(seed: string, prefix = "0x") {
  const hex = Array.from(seed)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}${hex}`.padEnd(66, "0").slice(0, 66);
}

function createRng(seed: string) {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }

  return () => {
    value += value << 13;
    value ^= value >>> 7;
    value += value << 3;
    value ^= value >>> 17;
    value += value << 5;
    return ((value >>> 0) % 1_000_000) / 1_000_000;
  };
}

function buildSeries({
  seed,
  points,
  stepSeconds,
  base,
  drift,
}: {
  seed: string;
  points: number;
  stepSeconds: number;
  base: number;
  drift: number;
}): PortfolioChartPoint[] {
  const rand = createRng(seed);
  const now = Math.floor(Date.now() / 1000);
  let value = base * 0.92;

  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin(index / 2.4) * base * 0.012;
    const move = (rand() - 0.46) * base * drift + wave;
    value = Math.max(base * 0.72, value + move);

    return {
      time: now - (points - 1 - index) * stepSeconds,
      value: Number(value.toFixed(2)),
    };
  });
}

export const MOCK_PORTFOLIO: Portfolio = {
  address: WALLET_ADDRESS,
  portfolioName: "Main Portfolio",
  walletLabel: "Personal wallet",
  ensName: "dex.eth",
  valueUsd: 12_845.42,
  change24h: 4.21,
  networkCount: 1,
  assetCount: 3,
  stats: {
    totalAssets: 3,
    totalNetworks: 1,
    totalPositions: 1,
    transactions: 12,
    portfolioChange24h: 4.21,
    largestHolding: {
      symbol: "MST",
      valueUsd: 7_891.67,
      allocation: 61.43,
    },
  },
};

export const MOCK_ASSETS: PortfolioAsset[] = [
  {
    id: "mst",
    symbol: "MST",
    name: "tMST Native Token",
    network: "MST Chain",
    chainId: 91562037,
    priceUsd: TOKENS.find((token) => token.symbol === "MST")?.priceUsd ?? 1.85,
    balance: 4265.76,
    valueUsd: 7_891.67,
    change24h: 4.8,
    allocation: 61.43,
    address: "",
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    network: "MST Chain",
    chainId: 91562037,
    priceUsd: 1.0,
    balance: 2_450.12,
    valueUsd: 2_450.12,
    change24h: 0.02,
    allocation: 19.08,
    address: TOKENS.find((token) => token.symbol === "USDC")?.address ?? "",
  },
  {
    id: "wmst",
    symbol: "WMST",
    name: "Wrapped MST",
    network: "MST Chain",
    chainId: 91562037,
    priceUsd: TOKENS.find((token) => token.symbol === "WMST")?.priceUsd ?? 1.85,
    balance: 1353.31,
    valueUsd: 2_503.63,
    change24h: 4.8,
    allocation: 19.49,
    address: TOKENS.find((token) => token.symbol === "WMST")?.address ?? "",
  }
];

export const MOCK_ACTIVITY: PortfolioActivity[] = [
  {
    id: "swap-1",
    type: "swap",
    asset: "USDC → WMST",
    amount: 1250,
    amountUsd: 1250,
    network: "MST Chain",
    hash: makeHash("swap-1"),
    timestamp: Date.now() - 12 * 60 * 1000,
    status: "confirmed",
    explorerUrl: "https://testnet.mstscan.com/tx/0xswap1",
  },
  {
    id: "send-1",
    type: "send",
    asset: "USDC",
    amount: 900,
    amountUsd: 900,
    network: "MST Chain",
    hash: makeHash("send-1"),
    timestamp: Date.now() - 43 * 60 * 1000,
    status: "confirmed",
    explorerUrl: "https://testnet.mstscan.com/tx/0xsend1",
  },
  {
    id: "receive-1",
    type: "receive",
    asset: "MST",
    amount: 650,
    amountUsd: 1205.31,
    network: "MST Chain",
    hash: makeHash("receive-1"),
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    status: "confirmed",
    explorerUrl: "https://testnet.mstscan.com/tx/0xreceive1",
  },
  {
    id: "approve-1",
    type: "approve",
    asset: "USDC",
    amount: 1000,
    amountUsd: 1000,
    network: "MST Chain",
    hash: makeHash("approve-1"),
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    status: "confirmed",
    explorerUrl: "https://testnet.mstscan.com/tx/0xapprove1",
  }
];

export const MOCK_POSITIONS: PortfolioPosition[] = [
  {
    id: "wmst-usdc",
    pool: "WMST / USDC 0.30%",
    assets: ["WMST", "USDC"],
    network: "MST Chain",
    liquidityUsd: 24_180.32,
    apr: 12.4,
    feesEarnedUsd: 412.54,
    status: "In Range",
    hash: makeHash("wmst-usdc"),
  }
];

const TIMEFRAME_CONFIG: Record<PortfolioTimeframe, { points: number; stepSeconds: number; drift: number }> = {
  "1D": { points: 24, stepSeconds: 60 * 60, drift: 0.011 },
  "1W": { points: 7, stepSeconds: 60 * 60 * 24, drift: 0.016 },
  "1M": { points: 30, stepSeconds: 60 * 60 * 24, drift: 0.018 },
  "3M": { points: 90, stepSeconds: 60 * 60 * 24, drift: 0.02 },
  "1Y": { points: 52, stepSeconds: 60 * 60 * 24 * 7, drift: 0.024 },
  ALL: { points: 36, stepSeconds: 60 * 60 * 24 * 30, drift: 0.03 },
};

export const MOCK_HISTORY: Record<PortfolioTimeframe, PortfolioChartPoint[]> = {
  "1D": buildSeries({ seed: "portfolio-1d", base: 12_845.42, ...TIMEFRAME_CONFIG["1D"] }),
  "1W": buildSeries({ seed: "portfolio-1w", base: 12_240.75, ...TIMEFRAME_CONFIG["1W"] }),
  "1M": buildSeries({ seed: "portfolio-1m", base: 11_780.48, ...TIMEFRAME_CONFIG["1M"] }),
  "3M": buildSeries({ seed: "portfolio-3m", base: 10_940.18, ...TIMEFRAME_CONFIG["3M"] }),
  "1Y": buildSeries({ seed: "portfolio-1y", base: 8_900.22, ...TIMEFRAME_CONFIG["1Y"] }),
  ALL: buildSeries({ seed: "portfolio-all", base: 6_420.11, ...TIMEFRAME_CONFIG.ALL }),
};

export function clonePortfolio() {
  return structuredClone(MOCK_PORTFOLIO);
}

export function cloneAssets() {
  return structuredClone(MOCK_ASSETS);
}

export function cloneActivity() {
  return structuredClone(MOCK_ACTIVITY);
}

export function clonePositions() {
  return structuredClone(MOCK_POSITIONS);
}

export function cloneHistory(timeframe: PortfolioTimeframe) {
  return structuredClone(MOCK_HISTORY[timeframe]);
}
