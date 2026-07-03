import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { mstChain } from "./chains";

export const SUPPORTED_CHAINS = [
  mstChain,
  {
    id: 1,
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://cloudflare-eth.com"] } }
  },
  {
    id: 8453,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://mainnet.base.org"] } }
  },
  {
    id: 10,
    name: "Optimism",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://mainnet.optimism.io"] } }
  },
  {
    id: 42161,
    name: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://arb1.arbitrum.io/rpc"] } }
  }
];

export const wagmiConfig = createConfig({
  chains: [mstChain],
  connectors: [
    injected({
      target: "metaMask"
    })
  ],
  transports: {
    [mstChain.id]: http(mstChain.rpcUrls.default.http[0])
  }
});
