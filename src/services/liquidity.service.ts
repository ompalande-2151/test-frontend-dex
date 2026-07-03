import { dexApi } from "../lib/api";
import type { CreateLiquidityDto } from "../types/api";

export const liquidityService = {
  recordAddLiquidity: async (data: CreateLiquidityDto): Promise<any> => {
    const res = await dexApi.post("/add-liquidity", data);
    return res.data;
  },

  getAddLiquidityHistory: async (poolAddress: string): Promise<any[]> => {
    const res = await dexApi.get(`/add-liquidity/${poolAddress.toLowerCase()}`);
    return res.data;
  },

  recordRemoveLiquidity: async (data: CreateLiquidityDto): Promise<any> => {
    const res = await dexApi.post("/remove-liquidity", data);
    return res.data;
  },

  getRemoveLiquidityHistory: async (poolAddress: string): Promise<any[]> => {
    const res = await dexApi.get(`/remove-liquidity/${poolAddress.toLowerCase()}`);
    return res.data;
  },
};
