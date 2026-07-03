import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPortfolioActivity } from "../services/portfolio.service";
import { usePortfolioStore } from "../store/portfolio-store";

export function usePortfolioActivity(walletAddress?: string, enabled = true) {
  const refreshToken = usePortfolioStore((state) => state.refreshToken);
  const setActivity = usePortfolioStore((state) => state.setActivity);
  const setError = usePortfolioStore((state) => state.setError);

  const query = useQuery({
    queryKey: ["portfolio-activity", walletAddress ?? "default", refreshToken],
    enabled,
    queryFn: () => getPortfolioActivity({ walletAddress }),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!enabled) return;
    if (query.data) {
      setActivity(query.data);
      setError(null);
    }
  }, [enabled, query.data, setActivity, setError]);

  useEffect(() => {
    if (!enabled) return;
    if (query.error instanceof Error) {
      setError(query.error.message);
    }
  }, [enabled, query.error, setError]);

  return query;
}
