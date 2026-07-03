import { dexApi } from "../lib/api";
import type { Swap, CreateSwapDto } from "../types/api";

export const swapService = {
  recordSwap: async (data: CreateSwapDto): Promise<Swap> => {
    const res = await dexApi.post("/swaps", data);
    return res.data;
  },

  getSwaps: async (): Promise<Swap[]> => {
    const res = await dexApi.get("/swaps");
    return res.data;
  },

  getSwapsByWallet: async (address: string): Promise<Swap[]> => {
    const res = await dexApi.get(`/swaps/wallet/${address.toLowerCase()}`);
    return res.data;
  },
};
