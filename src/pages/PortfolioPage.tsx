import { useThemeStore } from "../store/themeStore";
import { PortfolioPage } from "../features/portfolio/components/PortfolioPage";
import { useAccount, useConnect } from "wagmi";
import { mstChain } from "../config/chains";

export default function PortfolioPageWrapper() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const metaMaskConnector =
    connectors.find((item) => item.name.toLowerCase().includes("metamask")) ??
    connectors.find((item) => item.id === "injected");

  if (!isConnected) {
    return (
      <div
        className={`min-h-screen pt-[104px] pb-6 relative font-sans transition-colors duration-300 ease-in-out select-none flex flex-col items-center justify-center px-4 ${isDark ? "dark text-white" : "text-zinc-950"}`}
      >
        <div className="max-w-md w-full text-center p-8 rounded-3xl border border-zinc-200/50 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-xl">
          <p className={`text-sm mb-6 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
            you are not connected to the wallet , make sure to connect your wallet
          </p>
          <button
            onClick={() => metaMaskConnector && connect({ connector: metaMaskConnector, chainId: mstChain.id })}
            disabled={!metaMaskConnector}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pt-[104px] pb-12 relative font-sans transition-colors duration-300 ease-in-out select-none overflow-x-hidden px-4 sm:px-6 lg:px-8 ${isDark ? "dark text-white" : "text-zinc-950"}`}
    >
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        <PortfolioPage />
      </div>
    </div>
  );
}
