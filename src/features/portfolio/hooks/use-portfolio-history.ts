import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPortfolioHistory } from "../services/portfolio.service";
import { usePortfolioStore } from "../store/portfolio-store";

export function usePortfolioHistory(walletAddress?: string, enabled = true) {
  const refreshToken = usePortfolioStore((state) => state.refreshToken);
  const selectedTimeframe = usePortfolioStore((state) => state.selectedTimeframe);
  const setChartData = usePortfolioStore((state) => state.setChartData);
  const setError = usePortfolioStore((state) => state.setError);

  const query = useQuery({
    queryKey: ["portfolio-history", walletAddress ?? "default", selectedTimeframe, refreshToken],
    enabled,
    queryFn: () => getPortfolioHistory({ walletAddress, timeframe: selectedTimeframe }),
    staleTime: 20_000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!enabled) return;
    if (query.data) {
      setChartData(query.data);
      setError(null);
    }
  }, [enabled, query.data, setChartData, setError]);

  useEffect(() => {
    if (!enabled) return;
    if (query.error instanceof Error) {
      setError(query.error.message);
    }
  }, [enabled, query.error, setError]);

  return query;
}
