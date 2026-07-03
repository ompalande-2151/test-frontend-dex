import { dexApi } from "../lib/api";

export interface CreateLpPositionDto {
  tokenId: string;
  poolAddress: string;
  walletAddress: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  token0Amount: string;
  token1Amount: string;
}

export const lpPositionService = {
  syncPosition: async (data: CreateLpPositionDto): Promise<any> => {
    try {
      const res = await dexApi.post("/lp-positions", data);
      return res.data;
    } catch (e) {
      console.warn("Backend /lp-positions endpoint not implemented yet.");
      return null;
    }
  },

  getWalletPositions: async (address: string): Promise<any[]> => {
    try {
      const res = await dexApi.get(`/lp-positions/wallet/${address.toLowerCase()}`);
      return res.data;
    } catch (e) {
      console.warn("Backend /lp-positions endpoint not implemented yet.");
      return [];
    }
  },

  getPosition: async (tokenId: string): Promise<any> => {
    try {
      const res = await dexApi.get(`/lp-positions/${tokenId}`);
      return res.data;
    } catch (e) {
      console.warn("Backend /lp-positions endpoint not implemented yet.");
      return null;
    }
  },
};
