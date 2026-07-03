export const mstChain = {
  id: 91562037,
  name: "MST Testnet",
  nativeCurrency: {
    name: "tMSTC",
    symbol: "tMSTC",
    decimals: 18
  },
  rpcUrls: {
    default: { http: ["https://testnetrpc.mstblockchain.com"] }
  },
  blockExplorers: {
    default: { name: "MSTScan", url: "https://testnet.mstscan.com" }
  }
} as const;
