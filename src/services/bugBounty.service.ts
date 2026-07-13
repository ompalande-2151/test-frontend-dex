import { dexApi } from "../lib/api";
import type { CreateBugBountyReportDto } from "../types/api";

export const bugBountyService = {
  submitReport: async (data: CreateBugBountyReportDto): Promise<any> => {
    const res = await dexApi.post("/bug-bounty-reports", data);
    return res.data;
  },
};
