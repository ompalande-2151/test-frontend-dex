import { dexApi } from "../lib/api";
import type { Pool, CreatePoolDto } from "../types/api";

export const poolService = {
  createPool: async (data: CreatePoolDto): Promise<Pool> => {
    const res = await dexApi.post("/pools", data);
    return res.data;
  },

  getPools: async (): Promise<Pool[]> => {
    const res = await dexApi.get("/pools");
    return res.data;
  },

  getPool: async (address: string): Promise<Pool> => {
    const res = await dexApi.get(`/pools/${address.toLowerCase()}`);
    return res.data;
  },
};
