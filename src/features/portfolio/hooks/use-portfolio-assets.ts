import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPortfolioAssets } from "../services/portfolio.service";
import { usePortfolioStore } from "../store/portfolio-store";

export function usePortfolioAssets(walletAddress?: string, enabled = true) {
  const refreshToken = usePortfolioStore((state) => state.refreshToken);
  const setAssets = usePortfolioStore((state) => state.setAssets);
  const setError = usePortfolioStore((state) => state.setError);

  const query = useQuery({
    queryKey: ["portfolio-assets", walletAddress ?? "default", refreshToken],
    enabled,
    queryFn: () => getPortfolioAssets({ walletAddress }),
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!enabled) return;
    if (query.data) {
      setAssets(query.data);
      setError(null);
    }
  }, [enabled, query.data, setAssets, setError]);

  useEffect(() => {
    if (!enabled) return;
    if (query.error instanceof Error) {
      setError(query.error.message);
    }
  }, [enabled, query.error, setError]);

  return query;
}
