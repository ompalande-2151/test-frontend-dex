import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, ShieldCheck, Activity as ActivityIcon, Coins } from "lucide-react";
import { usePool, useCandles, useActivity, useToken } from "../hooks/api";
import { TokenLogo } from "../components/swap/TokenLogos";
import CandlestickChart from "../components/charts/CandlestickChart";
import { useThemeStore } from "../store/themeStore";
import { formatUnits } from "viem";
import { fmtNumber, fmtUsd, shortAddress } from "../lib/format";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

const safeParseBigInt = (val: string | number | undefined | null): bigint => {
  if (!val) return 0n;
  const str = typeof val === "number" ? val.toFixed(0) : String(val);
  const cleanStr = str.split(".")[0];
  try {
    return BigInt(cleanStr);
  } catch (e) {
    return 0n;
  }
};

export default function PoolDetailsPage() {
  const { address } = useParams<{ address: string }>();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [timeframe, setTimeframe] = useState("1h");

  const poolQuery = usePool(address);
  const candlesQuery = useCandles(address, timeframe);
  const activityQuery = useActivity(address);

  const pool = poolQuery.data;
  const rawCandles = candlesQuery.data || [];
  const activity = activityQuery.data || [];

  // Fetch token details dynamically for correct decimals
  const token0Query = useToken(pool?.token0Address);
  const token1Query = useToken(pool?.token1Address);

  const token0Decimals = token0Query.data?.decimals ?? 18;
  const token1Decimals = token1Query.data?.decimals ?? 18;

  // Transform backend candles to Lightweight-charts format
  const chartData = rawCandles.map((c) => ({
    time: c.time as any,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  if (poolQuery.isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 animate-pulse">
        Loading Pool Console...
      </div>
    );
  }

  if (poolQuery.isError || !pool) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-xl font-bold">Pool Not Found</h2>
        <p className="text-zinc-500 max-w-sm text-sm">
          No liquidity pool registered with address {address} on our backend system.
        </p>
        <Link
          to="/explore"
          className="px-5 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 font-bold hover:bg-cyan-500/20 transition-all border border-cyan-500/20"
        >
          Back to Explorer
        </Link>
      </div>
    );
  }

  const token0Symbol = pool.token0Symbol;
  const token1Symbol = pool.token1Symbol;

  // Format Reserves
  const formattedRes0 = formatUnits(safeParseBigInt(pool.currentToken0Amount), token0Decimals);
  const formattedRes1 = formatUnits(safeParseBigInt(pool.currentToken1Amount), token1Decimals);

  const formattedInitRes0 = formatUnits(safeParseBigInt(pool.token0InitialAmount), token0Decimals);
  const formattedInitRes1 = formatUnits(safeParseBigInt(pool.token1InitialAmount), token1Decimals);

  return (
    <div className="relative min-h-screen px-4 pb-20 pt-[104px] font-sans max-w-7xl mx-auto">
      {/* Back button */}
      <Link
        to="/explore"
        className="inline-flex items-center gap-2 mb-6 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Explore
      </Link>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            <TokenLogo symbol={token0Symbol} size={42} />
            <TokenLogo symbol={token1Symbol} size={42} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              {token0Symbol} / {token1Symbol}
              <span className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-bold uppercase tracking-wider
                ${isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-500/5 border-cyan-500/20 text-cyan-600"}`}
              >
                {(pool.feeTier / 10000).toFixed(2)}% Pool
              </span>
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1 select-all hover:underline cursor-pointer">
              {pool.poolAddress}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`https://testnet.mstscan.com/address/${pool.poolAddress}`}
            target="_blank"
            rel="noreferrer"
            className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-[0.98]
              ${isDark
                ? "bg-white/5 border-zinc-800 text-zinc-300 hover:bg-white/10 hover:border-zinc-700"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"}`}
          >
            <Coins size={14} />
            Pool Contract
            <ExternalLink size={12} />
          </a>
          <a
            href={`https://testnet.mstscan.com/tx/${pool.txHash}`}
            target="_blank"
            rel="noreferrer"
            className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-[0.98]
              ${isDark
                ? "bg-white/5 border-zinc-800 text-zinc-300 hover:bg-white/10 hover:border-zinc-700"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"}`}
          >
            Creation Tx
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Grid containing Chart + Reserves Info */}
      <div className="grid xl:grid-cols-[1fr_360px] gap-8 mb-10 items-start">
        {/* Candlestick Chart Card */}
        <div className={`p-6 rounded-[2rem] border shadow-2xl backdrop-blur-2xl transition-all duration-300
          ${isDark ? "bg-[#131A2A]/70 border-[#2C364F]/50" : "bg-white/80 border-zinc-200/60"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-base uppercase tracking-wider flex items-center gap-2">
              <ActivityIcon size={16} className="text-cyan-400" />
              OHLC Price History
            </h3>

            {/* Timeframe selector */}
            <div className={`flex items-center gap-1 rounded-full p-1 border transition-all duration-300
              ${isDark ? "bg-[#131A2A]/80 border-[#2C364F]/50" : "bg-zinc-100/80 border-zinc-200/50"}`}
            >
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${timeframe === tf
                    ? isDark
                      ? "bg-cyan-500/10 text-cyan-400 shadow-sm border border-cyan-500/20"
                      : "bg-white text-zinc-950 shadow-sm border border-zinc-200"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full relative h-[320px] flex items-center justify-center">
            {candlesQuery.isLoading ? (
              <span className="text-xs font-bold tracking-widest text-zinc-500 animate-pulse uppercase">
                Syncing Candle Stream...
              </span>
            ) : chartData.length === 0 ? (
              <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
                No swaps recorded yet. Add liquidity or perform swaps to populate chart.
              </span>
            ) : (
              <div className="w-full h-full">
                <CandlestickChart data={chartData} />
              </div>
            )}
          </div>
        </div>

        {/* Reserves and Metadata Card */}
        <div className="space-y-6">
          {/* Reserves */}
          <div className={`p-6 rounded-[2rem] border shadow-2xl backdrop-blur-2xl transition-all duration-300
            ${isDark ? "bg-[#131A2A]/70 border-[#2C364F]/50 text-white" : "bg-white/80 border-zinc-200/60 text-zinc-950"}`}
          >
            <h3 className={`text-sm uppercase font-bold tracking-wider flex items-center gap-1.5 border-b pb-4 mb-4
              ${isDark ? "border-[#2C364F]/40 text-cyan-400" : "border-zinc-200 text-cyan-600"}`}
            >
              Pool Reserves
            </h3>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">Current Reserves</div>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center bg-background/40 p-3 rounded-xl border border-border/20">
                    <span className="font-bold flex items-center gap-1.5"><TokenLogo symbol={token0Symbol} size={20} />{token0Symbol}</span>
                    <span className="font-mono font-bold text-sm">{fmtNumber(Number(formattedRes0))}</span>
                  </div>
                  <div className="flex justify-between items-center bg-background/40 p-3 rounded-xl border border-border/20">
                    <span className="font-bold flex items-center gap-1.5"><TokenLogo symbol={token1Symbol} size={20} />{token1Symbol}</span>
                    <span className="font-mono font-bold text-sm">{fmtNumber(Number(formattedRes1))}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">Initial Reserves</div>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center bg-background/40 p-3 rounded-xl border border-border/20">
                    <span className="font-bold flex items-center gap-1.5"><TokenLogo symbol={token0Symbol} size={20} />{token0Symbol}</span>
                    <span className="font-mono font-bold text-sm">{fmtNumber(Number(formattedInitRes0))}</span>
                  </div>
                  <div className="flex justify-between items-center bg-background/40 p-3 rounded-xl border border-border/20">
                    <span className="font-bold flex items-center gap-1.5"><TokenLogo symbol={token1Symbol} size={20} />{token1Symbol}</span>
                    <span className="font-mono font-bold text-sm">{fmtNumber(Number(formattedInitRes1))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className={`p-6 rounded-[2rem] border shadow-2xl backdrop-blur-2xl transition-all duration-300
            ${isDark ? "bg-[#131A2A]/70 border-[#2C364F]/50 text-white" : "bg-white/80 border-zinc-200/60 text-zinc-950"}`}
          >
            <h3 className={`text-sm uppercase font-bold tracking-wider flex items-center gap-1.5 border-b pb-4 mb-4
              ${isDark ? "border-[#2C364F]/40 text-cyan-400" : "border-zinc-200 text-cyan-600"}`}
            >
              Metadata Specifications
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border/10">
                <span className="text-muted-foreground">Protocol</span>
                <span className="font-bold uppercase font-mono">{pool.protocol}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/10">
                <span className="text-muted-foreground">Chain ID</span>
                <span className="font-bold font-mono">{pool.chainId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/10">
                <span className="text-muted-foreground">Creator Wallet</span>
                <a
                  href={`https://testnet.mstscan.com/address/${pool.creatorWallet}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold font-mono text-cyan-400 hover:underline"
                >
                  {shortAddress(pool.creatorWallet, 5)}
                </a>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Created At</span>
                <span className="font-bold font-mono text-xs">{new Date(pool.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className={`p-6 rounded-[2rem] border shadow-2xl backdrop-blur-2xl transition-all duration-300
        ${isDark ? "bg-[#131A2A]/70 border-[#2C364F]/50" : "bg-white/80 border-zinc-200/60"}`}
      >
        <h3 className="font-bold text-base uppercase tracking-wider mb-6 flex items-center gap-2">
          <ActivityIcon size={16} className="text-cyan-400" />
          Live Pool Activity Feed
        </h3>

        {activityQuery.isLoading || token0Query.isLoading || token1Query.isLoading ? (
          <div className="py-10 text-center text-xs font-mono text-zinc-500 animate-pulse uppercase">
            Syncing Transactions Stream...
          </div>
        ) : activity.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-border/30 max-w-md mx-auto space-y-3">
            <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-sm font-bold tracking-tight">No actions logged yet</h3>
            <p className="text-xs text-muted-foreground font-light px-6 leading-relaxed">
              No Swaps or Liquidity operations have been recorded for this pool yet on the indexing server.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-xs uppercase tracking-[0.18em] border-b font-bold pb-3
                  ${isDark ? "border-[#2C364F]/50 text-zinc-400" : "border-zinc-200 text-zinc-500"}`}
                >
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Account Wallet</th>
                  <th className="py-3 px-4">Transaction Details</th>
                  <th className="py-3 px-4">Blockchain Hash</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${isDark ? "divide-[#2C364F]/30" : "divide-zinc-200/40"}`}>
                {activity.map((item) => {
                  const typeLower = item.type.toLowerCase();
                  const isSwap = typeLower === "swap";
                  const isAddLiq = typeLower === "add-liquidity" || typeLower === "add_liquidity";
                  const isRemoveLiq = typeLower === "remove-liquidity" || typeLower === "remove_liquidity";

                  const decIn = item.tokenIn?.toLowerCase() === pool.token0Address.toLowerCase() ? token0Decimals : token1Decimals;
                  const decOut = item.tokenOut?.toLowerCase() === pool.token0Address.toLowerCase() ? token0Decimals : token1Decimals;

                  return (
                    <tr key={item._id} className="hover:bg-cyan-500/5 transition-colors">
                      <td className="py-4 px-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border
                          ${isSwap
                            ? isDark ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-cyan-500/15 border-cyan-500/20 text-cyan-700"
                            : isAddLiq
                              ? isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-emerald-500/15 border-emerald-500/20 text-emerald-700"
                              : isDark ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-rose-500/15 border-rose-500/20 text-rose-700"
                          }`}
                        >
                          {typeLower}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-muted-foreground hover:text-foreground">
                        <a href={`https://testnet.mstscan.com/address/${item.walletAddress}`} target="_blank" rel="noreferrer">
                          {shortAddress(item.walletAddress, 6)}
                        </a>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs">
                        {isSwap ? (
                          <span className="flex flex-wrap items-center gap-1">
                            <span className="font-semibold text-cyan-400">
                              {fmtNumber(Number(formatUnits(safeParseBigInt(item.amountIn), decIn)))}
                            </span>{" "}
                            {item.tokenIn?.toLowerCase() === pool.token0Address.toLowerCase() ? token0Symbol : token1Symbol}
                            <span className="text-zinc-500 px-1">➜</span>
                            <span className="font-semibold text-emerald-400">
                              {fmtNumber(Number(formatUnits(safeParseBigInt(item.amountOut), decOut)))}
                            </span>{" "}
                            {item.tokenOut?.toLowerCase() === pool.token0Address.toLowerCase() ? token0Symbol : token1Symbol}
                          </span>
                        ) : (
                          <span>
                            <span className="text-zinc-400 uppercase text-[10px] font-bold tracking-wider mr-1.5">
                              {isAddLiq ? "Deposit" : isRemoveLiq ? "Withdrawal" : "Liquidity"}
                            </span>
                            <span className="font-semibold text-zinc-200">
                              {fmtNumber(Number(formatUnits(safeParseBigInt(item.token0Amount), token0Decimals)))}
                            </span>{" "}
                            {token0Symbol} +{" "}
                            <span className="font-semibold text-zinc-200">
                              {fmtNumber(Number(formatUnits(safeParseBigInt(item.token1Amount), token1Decimals)))}
                            </span>{" "}
                            {token1Symbol}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-cyan-400 hover:underline">
                        <a href={`https://testnet.mstscan.com/tx/${item.txHash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                          {shortAddress(item.txHash, 6)}
                          <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground text-xs font-light">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

