import { dexApi } from "../lib/api";
import type { Activity } from "../types/api";

export const activityService = {
  getPoolActivity: async (poolAddress: string): Promise<Activity[]> => {
    const res = await dexApi.get(`/activity/${poolAddress.toLowerCase()}`);
    return res.data;
  },
};
