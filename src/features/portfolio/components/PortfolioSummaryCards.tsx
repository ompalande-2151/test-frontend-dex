import type { Portfolio } from "../types";
import { PortfolioMetricCard } from "./PortfolioMetricCard";
import { formatPortfolioPct, formatAssetUsd, formatLargeNumber } from "../utils/portfolio-format";
import { displayTokenSymbol } from "@/config";

interface PortfolioSummaryCardsProps {
  portfolio: Portfolio | null;
  isLoading?: boolean;
  selectedTimeframe?: string;
}

export function PortfolioSummaryCards({ portfolio, isLoading, selectedTimeframe = "1D" }: PortfolioSummaryCardsProps) {
  const stats = portfolio?.stats;

  const changeHelper =
    selectedTimeframe === "1D"
      ? "24H portfolio performance"
      : selectedTimeframe === "1W"
      ? "7D portfolio performance"
      : selectedTimeframe === "1M"
      ? "30D portfolio performance"
      : selectedTimeframe === "3M"
      ? "90D portfolio performance"
      : selectedTimeframe === "1Y"
      ? "1Y portfolio performance"
      : "All-time portfolio performance";

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <PortfolioMetricCard label="Total assets" value={formatLargeNumber(stats?.totalAssets ?? 0)} helper="Tracked positions across your wallet" loading={isLoading} />
      <PortfolioMetricCard label="Total networks" value={formatLargeNumber(stats?.totalNetworks ?? 0)} helper="Cross-chain exposure" loading={isLoading} />
      <PortfolioMetricCard label="Total positions" value={formatLargeNumber(stats?.totalPositions ?? 0)} helper="LP positions and vaults" loading={isLoading} />
      <PortfolioMetricCard label="Transactions" value={formatLargeNumber(stats?.transactions ?? 0)} helper="Recent onchain activity" loading={isLoading} />
      <PortfolioMetricCard
        label="Portfolio change"
        value={formatPortfolioPct(stats?.portfolioChange24h ?? 0)}
        helper={changeHelper}
        loading={isLoading}
        tone={(stats?.portfolioChange24h ?? 0) >= 0 ? "success" : "destructive"}
      />
      <PortfolioMetricCard
        label="Largest holding"
        value={stats ? displayTokenSymbol(stats.largestHolding.symbol) : "—"}
        helper={stats ? `${formatAssetUsd(stats.largestHolding.symbol, stats.largestHolding.valueUsd)} • ${stats.largestHolding.allocation.toFixed(2)}%` : "Largest allocation"}
        loading={isLoading}
      />
    </div>
  );
}
