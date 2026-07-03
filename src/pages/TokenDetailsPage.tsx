import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Activity, Coins, Globe, Landmark } from "lucide-react";
import { useToken, useTokenMarketData } from "../hooks/api";
import { useThemeStore } from "../store/themeStore";
import { fmtNumber, fmtUsd, fmtPct, shortAddress } from "../lib/format";

export default function TokenDetailsPage() {
  const { address } = useParams<{ address: string }>();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const tokenQuery = useToken(address);
  const marketQuery = useTokenMarketData(address);

  const token = tokenQuery.data;
  const market = marketQuery.data;

  if (tokenQuery.isLoading || marketQuery.isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 animate-pulse">
        Loading Token Console...
      </div>
    );
  }

  if (tokenQuery.isError || !token) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-xl font-bold">Token Not Found</h2>
        <p className="text-zinc-500 max-w-sm text-sm">
          No token registered with address {address} on our backend system.
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

  const tokenPrice = market ? market.price : Number(token.price || "0");
  const change24h = market ? market.change24h : 0;
  const volume24h = market ? market.volume24h : 0;
  const marketCap = market ? market.marketCap : 0;
  const fdv = market ? market.fdv : 0;
  const tokenImage = market ? market.image : null;

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
          {tokenImage ? (
            <img
              src={tokenImage}
              alt={token.symbol}
              className="w-[48px] h-[48px] rounded-full shadow-lg object-contain bg-zinc-900 border border-zinc-800"
            />
          ) : (
            <div className="w-[48px] h-[48px] rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
              {token.symbol.substring(0, 2)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              {token.symbol}
              <span className="text-zinc-500 font-normal text-base">Token Asset</span>
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1 select-all hover:underline cursor-pointer">
              {token.tokenAddress}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`https://testnet.mstscan.com/address/${token.tokenAddress}`}
            target="_blank"
            rel="noreferrer"
            className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-[0.98]
              ${isDark
                ? "bg-white/5 border-zinc-800 text-zinc-300 hover:bg-white/10 hover:border-zinc-700"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"}`}
          >
            <Coins size={14} />
            Token Contract
            <ExternalLink size={12} />
          </a>
          <Link
            to={`/pools/${token.firstPoolAddress}`}
            className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-[0.98]
              ${isDark
                ? "bg-white/5 border-zinc-800 text-cyan-400 hover:bg-white/10 hover:border-zinc-700 border-cyan-500/10"
                : "bg-white border-zinc-200 text-cyan-600 hover:bg-zinc-50"}`}
          >
            Launch Pool details
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox
          label="Current Price"
          value={fmtUsd(tokenPrice)}
          isDelta={true}
          delta={change24h}
          isDark={isDark}
        />
        <StatBox
          label="24h Volume"
          value={volume24h > 0 ? fmtUsd(volume24h, { compact: true }) : "$0.00"}
          isDark={isDark}
        />
        <StatBox
          label="Market Cap"
          value={marketCap > 0 ? fmtUsd(marketCap, { compact: true }) : "$0.00"}
          isDark={isDark}
        />
        <StatBox
          label="Fully Diluted Val."
          value={fdv > 0 ? fmtUsd(fdv, { compact: true }) : "$0.00"}
          isDark={isDark}
        />
      </div>

      {/* Specifications */}
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className={`p-6 rounded-[2rem] border shadow-2xl backdrop-blur-2xl transition-all duration-300
          ${isDark ? "bg-[#131A2A]/70 border-[#2C364F]/50 text-white" : "bg-white/80 border-zinc-200/60 text-zinc-950"}`}
        >
          <h3 className={`text-sm uppercase font-bold tracking-wider flex items-center gap-1.5 border-b pb-4 mb-4
            ${isDark ? "border-[#2C364F]/40 text-cyan-400" : "border-zinc-200 text-cyan-600"}`}
          >
            <Landmark size={15} />
            Token Specifications
          </h3>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-border/10">
              <span className="text-zinc-500">Decimals</span>
              <span className="font-bold font-mono">{token.decimals}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/10">
              <span className="text-zinc-500">Chain ID Reference</span>
              <span className="font-bold font-mono">{token.chainId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/10">
              <span className="text-zinc-500">First Registry Pool</span>
              <Link
                to={`/pools/${token.firstPoolAddress}`}
                className="font-bold font-mono text-cyan-400 hover:underline"
              >
                {shortAddress(token.firstPoolAddress, 6)}
              </Link>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-zinc-500">Last Registered Price</span>
              <span className="font-bold font-mono">{fmtUsd(Number(token.price || "0"))}</span>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-[2rem] border shadow-2xl backdrop-blur-2xl transition-all duration-300
          ${isDark ? "bg-[#131A2A]/70 border-[#2C364F]/50 text-white" : "bg-white/80 border-zinc-200/60 text-zinc-950"}`}
        >
          <h3 className={`text-sm uppercase font-bold tracking-wider flex items-center gap-1.5 border-b pb-4 mb-4
            ${isDark ? "border-[#2C364F]/40 text-cyan-400" : "border-zinc-200 text-cyan-600"}`}
          >
            <Globe size={15} />
            Explorer Directory
          </h3>

          <p className="text-xs text-muted-foreground mb-4 leading-relaxed font-light">
            This token asset is registered and validated on the tMST Testnet blockchain node indexes. View addresses, historical transfers, and smart contract source code directly on the Block Explorer.
          </p>

          <div className="space-y-3">
            <a
              href={`https://testnet.mstscan.com/token/${token.tokenAddress}`}
              target="_blank"
              rel="noreferrer"
              className={`w-full p-3.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between active:scale-[0.98]
                ${isDark
                  ? "bg-white/5 border-zinc-800 text-zinc-300 hover:bg-white/10 hover:border-zinc-700"
                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"}`}
            >
              <span>Verify Token Stats</span>
              <ExternalLink size={12} />
            </a>
            <a
              href={`https://testnet.mstscan.com/address/${token.firstPoolAddress}`}
              target="_blank"
              rel="noreferrer"
              className={`w-full p-3.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between active:scale-[0.98]
                ${isDark
                  ? "bg-white/5 border-zinc-800 text-zinc-300 hover:bg-white/10 hover:border-zinc-700"
                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"}`}
            >
              <span>Verify First Liquidity Pool</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  isDelta?: boolean;
  delta?: number;
  isDark?: boolean;
}

function StatBox({ label, value, isDelta, delta = 0, isDark }: StatBoxProps) {
  return (
    <div className={`rounded-3xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-float
      ${isDark
        ? "bg-[#131A2A]/70 border-[#2C364F]/50 text-white shadow-xl shadow-black/10"
        : "bg-white/80 border-zinc-200/50 text-zinc-950 shadow-md shadow-black/5"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {isDelta && (
        <div className={`mt-1.5 text-xs font-semibold flex items-center gap-1 ${delta >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
          <span>{delta >= 0 ? "▲" : "▼"}</span>
          <span>{Math.abs(delta)}%</span>
        </div>
      )}
    </div>
  );
}
