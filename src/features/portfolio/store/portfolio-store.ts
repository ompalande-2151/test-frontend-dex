import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Portfolio,
  PortfolioActivity,
  PortfolioAsset,
  PortfolioChartPoint,
  PortfolioPosition,
  PortfolioTab,
  PortfolioTimeframe,
} from "../types";

interface PortfolioState {
  portfolio: Portfolio | null;
  assets: PortfolioAsset[];
  activity: PortfolioActivity[];
  positions: PortfolioPosition[];
  chartData: PortfolioChartPoint[];
  selectedTimeframe: PortfolioTimeframe;
  selectedTab: PortfolioTab;
  loading: boolean;
  error: string | null;
  refreshToken: number;
  setPortfolio: (portfolio: Portfolio | null) => void;
  setAssets: (assets: PortfolioAsset[]) => void;
  setActivity: (activity: PortfolioActivity[]) => void;
  setPositions: (positions: PortfolioPosition[]) => void;
  setChartData: (chartData: PortfolioChartPoint[]) => void;
  appendChartPoint: (point: PortfolioChartPoint) => void;
  setTimeframe: (timeframe: PortfolioTimeframe) => void;
  setTab: (tab: PortfolioTab) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetPortfolioState: () => void;
  refreshPortfolio: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      portfolio: null,
      assets: [],
      activity: [],
      positions: [],
      chartData: [],
      selectedTimeframe: "1M",
      selectedTab: "overview",
      loading: false,
      error: null,
      refreshToken: 0,
      setPortfolio: (portfolio) => set({ portfolio }),
      setAssets: (assets) => set({ assets }),
      setActivity: (activity) => set({ activity }),
      setPositions: (positions) => set({ positions }),
      setChartData: (chartData) => set({ chartData }),
      appendChartPoint: (point) =>
        set((state) => ({
          chartData: [...state.chartData, point].slice(-240),
        })),
      setTimeframe: (selectedTimeframe) => set({ selectedTimeframe }),
      setTab: (selectedTab) => set({ selectedTab }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      resetPortfolioState: () =>
        set({
          portfolio: null,
          assets: [],
          activity: [],
          positions: [],
          chartData: [],
          loading: false,
          error: null,
        }),
      refreshPortfolio: () => set((state) => ({ refreshToken: state.refreshToken + 1 })),
    }),
    { name: "dex-portfolio-state" },
  ),
);
