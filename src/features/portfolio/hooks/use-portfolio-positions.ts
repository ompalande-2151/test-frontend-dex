import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPortfolioPositions } from "../services/portfolio.service";
import { usePortfolioStore } from "../store/portfolio-store";

export function usePortfolioPositions(walletAddress?: string, enabled = true) {
  const refreshToken = usePortfolioStore((state) => state.refreshToken);
  const setPositions = usePortfolioStore((state) => state.setPositions);
  const setError = usePortfolioStore((state) => state.setError);

  const query = useQuery({
    queryKey: ["portfolio-positions", walletAddress ?? "default", refreshToken],
    enabled,
    queryFn: () => getPortfolioPositions({ walletAddress }),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!enabled) return;
    if (query.data) {
      setPositions(query.data);
      setError(null);
    }
  }, [enabled, query.data, setError, setPositions]);

  useEffect(() => {
    if (!enabled) return;
    if (query.error instanceof Error) {
      setError(query.error.message);
    }
  }, [enabled, query.error, setError]);

  return query;
}
