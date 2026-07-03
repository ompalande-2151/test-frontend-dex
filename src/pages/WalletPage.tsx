import { AlertCircle, CheckCircle2, ExternalLink, PlugZap, Power, Wallet } from "lucide-react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { mstChain } from "../config/chains";
import { useThemeStore } from "../store/themeStore";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletPage() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const metaMaskConnector =
    connectors.find((item) => item.name.toLowerCase().includes("metamask")) ??
    connectors.find((item) => item.id === "injected");

  const onMstChain = chainId === mstChain.id;

  return (
    <main className={`mx-auto flex min-h-screen max-w-5xl items-center px-4 pt-[104px] pb-10 select-none ${isDark ? "dark" : ""}`}>
      <section className="grid w-full gap-6 md:grid-cols-[1fr_380px] md:items-center relative z-10">
        <div>
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
            <Wallet size={22} />
          </div>
          <h1 className="text-5xl font-extrabold uppercase tracking-wide">Connect MetaMask</h1>
          <p className="mt-3 max-w-xl text-base leading-6 text-zinc-600 dark:text-zinc-400 font-medium">
            Connect your wallet to MSWAP, confirm you are on MST Testnet, then continue to swaps and liquidity.
          </p>
        </div>

        <div className="rounded-3xl border-none bg-white/75 dark:bg-[#0b0b14]/60 backdrop-blur-2xl p-6 shadow-2xl shadow-black/40">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-wide">Wallet Hub</h2>
              <p className="text-sm font-bold font-mono text-zinc-500 mt-0.5">{isConnected ? connector?.name ?? "Connected" : "Not connected"}</p>
            </div>
            <span className={`h-3 w-3 rounded-full shadow-lg ${isConnected ? "bg-emerald-400" : "bg-zinc-700"}`} />
          </div>

          {isConnected && address ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-zinc-50/60 dark:bg-white/5 p-4 border border-zinc-200/40 dark:border-none">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">Address</div>
                <div className="mt-1 font-mono text-base font-bold text-zinc-950 dark:text-white tracking-wide">{shortenAddress(address)}</div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-zinc-50/60 dark:bg-white/5 p-4 border border-zinc-200/40 dark:border-none">
                {onMstChain ? <CheckCircle2 className="text-emerald-400 shrink-0" size={20} /> : <AlertCircle className="text-amber-400 shrink-0" size={20} />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider font-mono">{onMstChain ? "MST Testnet connected" : "Wrong network"}</div>
                  <div className="text-sm font-bold font-mono text-zinc-500 mt-1">Current chain ID: {chainId}</div>
                </div>
              </div>

              {!onMstChain && (
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-3.5 text-base font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSwitching}
                  onClick={() => switchChain({ chainId: mstChain.id })}
                >
                  <PlugZap size={18} />
                  {isSwitching ? "Switching..." : "Switch to MST Testnet"}
                </button>
              )}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-750 bg-zinc-50 dark:bg-white/5 px-4 py-3.5 text-base font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-[0.98] transition-all"
                onClick={() => disconnect()}
              >
                <Power size={18} />
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-3.5 text-base font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!metaMaskConnector || isPending}
                onClick={() => metaMaskConnector && connect({ connector: metaMaskConnector, chainId: mstChain.id })}
              >
                <Wallet size={18} />
                {isPending ? "Connecting..." : "Connect MetaMask"}
              </button>

              {!metaMaskConnector && (
                <a
                  className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-750 bg-zinc-50 dark:bg-white/5 px-4 py-3.5 text-base font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-[0.98] transition-all text-center"
                  href="https://metamask.io/download/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Install MetaMask
                  <ExternalLink size={16} />
                </a>
              )}

              {error && <p className="rounded-2xl bg-red-500/10 p-3 text-sm font-mono font-bold text-red-300 border-none">{error.message}</p>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
