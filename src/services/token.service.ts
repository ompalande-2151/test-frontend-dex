import { dexApi } from "../lib/api";
import type { Token } from "../types/api";

export const tokenService = {
  getTokens: async (): Promise<Token[]> => {
    const res = await dexApi.get("/tokens");
    return res.data;
  },

  getToken: async (address: string): Promise<Token> => {
    const res = await dexApi.get(`/tokens/${address.toLowerCase()}`);
    return res.data;
  },
};
