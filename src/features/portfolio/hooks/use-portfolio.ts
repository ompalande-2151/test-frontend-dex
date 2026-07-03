import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPortfolio } from "../services/portfolio.service";
import { usePortfolioStore } from "../store/portfolio-store";

export function usePortfolio(walletAddress?: string, enabled = true) {
  const refreshToken = usePortfolioStore((state) => state.refreshToken);
  const setPortfolio = usePortfolioStore((state) => state.setPortfolio);
  const setLoading = usePortfolioStore((state) => state.setLoading);
  const setError = usePortfolioStore((state) => state.setError);

  const query = useQuery({
    queryKey: ["portfolio", walletAddress ?? "default", refreshToken],
    enabled,
    queryFn: () => getPortfolio({ walletAddress }),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!enabled) return;
    setLoading(query.isLoading || query.isFetching);
  }, [enabled, query.isFetching, query.isLoading, setLoading]);

  useEffect(() => {
    if (!enabled) return;
    if (query.data) {
      setPortfolio(query.data);
      setError(null);
    }
  }, [enabled, query.data, setError, setPortfolio]);

  useEffect(() => {
    if (!enabled) return;
    if (query.error instanceof Error) {
      setError(query.error.message);
    }
  }, [enabled, query.error, setError]);

  return query;
}
