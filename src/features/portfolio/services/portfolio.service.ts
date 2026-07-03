import type { PortfolioServiceArgs, PortfolioTimeframe } from "../types";
import {
  cloneActivity,
  cloneAssets,
  cloneHistory,
  clonePortfolio,
  clonePositions,
} from "../mock/portfolio.mock";

function delay(ms = 180) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shouldUseWindowSafeDelay() {
  return typeof window !== "undefined";
}

export async function getPortfolio(_args: PortfolioServiceArgs = {}) {
  if (shouldUseWindowSafeDelay()) await delay();
  return clonePortfolio();
}

export async function getPortfolioAssets(_args: PortfolioServiceArgs = {}) {
  if (shouldUseWindowSafeDelay()) await delay();
  return cloneAssets();
}

export async function getPortfolioActivity(_args: PortfolioServiceArgs = {}) {
  if (shouldUseWindowSafeDelay()) await delay();
  return cloneActivity();
}

export async function getPortfolioPositions(_args: PortfolioServiceArgs = {}) {
  if (shouldUseWindowSafeDelay()) await delay();
  return clonePositions();
}

export async function getPortfolioHistory({ timeframe = "1M" }: PortfolioServiceArgs = {}) {
  if (shouldUseWindowSafeDelay()) await delay();
  return cloneHistory(timeframe as PortfolioTimeframe);
}
