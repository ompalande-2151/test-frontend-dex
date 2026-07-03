import { type Address } from "viem";
import type { PortfolioActivity } from "../types";

export interface SubgraphSwap {
  id: string;
  amount0: string;
  amount1: string;
  timestamp: string;
  sender?: string;
  recipient?: string;
  pool: {
    id: string;
    token0: { id: string; symbol: string; decimals: number };
    token1: { id: string; symbol: string; decimals: number };
  };
}

export async function fetchUserSwapsFromSubgraph(userAddress: string, chainId: number): Promise<PortfolioActivity[]> {
  const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL || "http://localhost:8000/subgraphs/name/mst/rapidex";

  const query = `
    query GetUserSwaps($userAddress: Bytes!) {
      swaps(
        where: { sender: $userAddress }
        orderBy: timestamp
        orderDirection: desc
        first: 30
      ) {
        id
        amount0
        amount1
        timestamp
        sender
        recipient
        pool {
          id
          token0 {
            id
            symbol
            decimals
          }
          token1 {
            id
            symbol
            decimals
          }
        }
      }
    }
  `;

  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        userAddress: userAddress.toLowerCase(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Subgraph request failed: ${response.statusText}`);
  }

  const { data, errors } = await response.json();
  if (errors) {
    throw new Error(errors[0]?.message || "GraphQL query error");
  }

  const swaps: SubgraphSwap[] = data.swaps || [];

  return swaps.map((swap) => {
    const token0 = swap.pool.token0;
    const token1 = swap.pool.token1;
    const amt0 = Math.abs(Number(swap.amount0));
    const amt1 = Math.abs(Number(swap.amount1));
    
    // Peg USDC to 1.0, default WMST price to approximately 1.85 as a backup
    const price0 = token0.symbol === "USDC" ? 1.0 : 1.85;
    const amountUsd = amt0 * price0;

    return {
      id: swap.id,
      type: "swap",
      asset: `${token0.symbol} → ${token1.symbol}`,
      amount: amt1,
      amountUsd,
      network: chainId === 91562037 ? "MST Testnet" : "Network",
      hash: swap.id.split("-")[0],
      timestamp: Number(swap.timestamp) * 1000,
      status: "confirmed",
      explorerUrl: `https://testnet.mstscan.com/tx/${swap.id.split("-")[0]}`
    };
  });
}
