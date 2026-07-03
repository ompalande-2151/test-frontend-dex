import { create } from "zustand";

interface SwapState {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageBps: number;
  deadlineMins: number;
  useRouterApi: boolean;
  setTokenIn: (t: string) => void;
  setTokenOut: (t: string) => void;
  switchTokens: () => void;
  setAmountIn: (a: string) => void;
  setSlippage: (bps: number) => void;
  setDeadlineMins: (mins: number) => void;
  setUseRouterApi: (toggle: boolean) => void;
}

export const useSwapStore = create<SwapState>((set) => ({
  tokenIn: "WMST",
  tokenOut: "USDC",
  amountIn: "",
  slippageBps: 50,
  deadlineMins: 20,
  useRouterApi: true,
  setTokenIn: (t) => set({ tokenIn: t }),
  setTokenOut: (t) => set({ tokenOut: t }),
  switchTokens: () => set((state) => ({ tokenIn: state.tokenOut, tokenOut: state.tokenIn })),
  setAmountIn: (a) => set({ amountIn: a }),
  setSlippage: (bps) => set({ slippageBps: bps }),
  setDeadlineMins: (mins) => set({ deadlineMins: mins }),
  setUseRouterApi: (toggle) => set({ useRouterApi: toggle })
}));
