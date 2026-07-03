import { dexApi } from "../lib/api";
import type { OHLCCandle } from "../types/api";

export const chartService = {
  getCandles: async (poolAddress: string, timeframe: string): Promise<OHLCCandle[]> => {
    const res = await dexApi.get("/chart-data/candles", {
      params: {
        poolAddress: poolAddress.toLowerCase(),
        timeframe,
      },
    });
    return res.data;
  },
};
