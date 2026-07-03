import { API_BASE } from "../config/contracts";

export interface MockToken {
  address: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  tvl: number;
}

export interface MockPool {
  address: string;
  token0: string;
  token1: string;
  feeTier: number;
  tvl: number;
  volume24h: number;
  apr: number;
}

export interface MockTx {
  hash: string;
  type: "swap" | "add" | "remove";
  token0: string;
  token1: string;
  usd: number;
  account: string;
  timestamp: number;
}

// Fetch tokens from backend dynamically using production-ready API_BASE
export async function topTokens(): Promise<MockToken[]> {
  try {
    const res = await fetch(`${API_BASE}/api/tokens`);
    const data = await res.json();
    return data.tokens || [];
  } catch (err) {
    console.error("Error fetching tokens from backend", err);
    return [];
  }
}

// Fetch pools from backend dynamically using production-ready API_BASE
export async function topPools(): Promise<MockPool[]> {
  try {
    const res = await fetch(`${API_BASE}/api/pools`);
    const data = await res.json();
    return (data.pools || []).map((p: any) => ({
      address: p.id,
      token0: p.token0,
      token1: p.token1,
      feeTier: p.feeTier,
      tvl: p.tvlUSD,
      volume24h: p.volumeUSD,
      apr: p.apr !== undefined ? p.apr : 12.4
    }));
  } catch (err) {
    console.error("Error fetching pools from backend", err);
    return [];
  }
}

// Fetch on-chain transactions log from backend dynamically using production-ready API_BASE
export async function recentTxs(count: number): Promise<MockTx[]> {
  try {
    const res = await fetch(`${API_BASE}/api/pools/transactions`);
    const data = await res.json();
    const txs = data.transactions || [];
    return txs.slice(0, count);
  } catch (err) {
    console.error("Error fetching transactions from backend", err);
    return [];
  }
}
