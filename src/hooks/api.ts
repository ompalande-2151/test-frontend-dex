import { useQuery } from "@tanstack/react-query";
import { poolService } from "../services/pool.service";
import { swapService } from "../services/swap.service";
import { tokenService } from "../services/token.service";
import { chartService } from "../services/chart.service";
import { marketService } from "../services/market.service";
import { activityService } from "../services/activity.service";
import { liquidityService } from "../services/liquidity.service";

// Pools Hooks
export function usePools() {
  return useQuery({
    queryKey: ["pools"],
    queryFn: () => poolService.getPools(),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function usePool(address?: string) {
  return useQuery({
    queryKey: ["pools", address?.toLowerCase() || ""],
    queryFn: () => poolService.getPool(address!),
    enabled: Boolean(address),
    staleTime: 15000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Swaps Hooks
export function useSwaps() {
  return useQuery({
    queryKey: ["swaps"],
    queryFn: () => swapService.getSwaps(),
    staleTime: 10000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useWalletSwaps(address?: string) {
  return useQuery({
    queryKey: ["swaps", "wallet", address?.toLowerCase() || ""],
    queryFn: () => swapService.getSwapsByWallet(address!),
    enabled: Boolean(address),
    staleTime: 15000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Tokens Hooks
export function useTokens() {
  return useQuery({
    queryKey: ["tokens"],
    queryFn: () => tokenService.getTokens(),
    staleTime: 15000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useToken(address?: string) {
  return useQuery({
    queryKey: ["tokens", address?.toLowerCase() || ""],
    queryFn: () => tokenService.getToken(address!),
    enabled: Boolean(address),
    staleTime: 15000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Market Data Hooks
export function useMarketData() {
  return useQuery({
    queryKey: ["market-data"],
    queryFn: () => marketService.getMarketData(),
    staleTime: 15000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useTokenMarketData(address?: string) {
  return useQuery({
    queryKey: ["market-data", address?.toLowerCase() || ""],
    queryFn: () => marketService.getTokenMarketData(address!),
    enabled: Boolean(address),
    staleTime: 15000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Candlestick Chart Hooks
export function useCandles(poolAddress?: string, timeframe?: string) {
  return useQuery({
    queryKey: ["candles", poolAddress?.toLowerCase() || "", timeframe || "1h"],
    queryFn: () => chartService.getCandles(poolAddress!, timeframe!),
    enabled: Boolean(poolAddress) && Boolean(timeframe),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Pool Activity Hook
export function useActivity(poolAddress?: string) {
  return useQuery({
    queryKey: ["activity", poolAddress?.toLowerCase() || ""],
    queryFn: () => activityService.getPoolActivity(poolAddress!),
    enabled: Boolean(poolAddress),
    staleTime: 10000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Add/Remove Liquidity History Hooks
export function useAddLiquidityHistory(poolAddress?: string) {
  return useQuery({
    queryKey: ["add-liquidity", poolAddress?.toLowerCase() || ""],
    queryFn: () => liquidityService.getAddLiquidityHistory(poolAddress!),
    enabled: Boolean(poolAddress),
    staleTime: 15000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useRemoveLiquidityHistory(poolAddress?: string) {
  return useQuery({
    queryKey: ["remove-liquidity", poolAddress?.toLowerCase() || ""],
    queryFn: () => liquidityService.getRemoveLiquidityHistory(poolAddress!),
    enabled: Boolean(poolAddress),
    staleTime: 15000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
