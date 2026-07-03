import { dexApi } from "../lib/api";
import type { MarketData } from "../types/api";

export const marketService = {
  getMarketData: async (): Promise<MarketData[]> => {
    const res = await dexApi.get("/market-data");
    return res.data;
  },

  getTokenMarketData: async (tokenAddress: string): Promise<MarketData> => {
    const res = await dexApi.get(`/market-data/${tokenAddress.toLowerCase()}`);
    return res.data;
  },
};
