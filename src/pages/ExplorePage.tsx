import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { formatUnits, isAddress, createPublicClient, http, type Address } from "viem";
import { TOKENS, getContractAddress, ABIS, poolSwapEvent, poolMintEvent, poolBurnEvent, erc20TransferEvent, erc20ApprovalEvent, wmstDepositEvent, wmstWithdrawalEvent, V3_FEE } from "@/config";
import { mstChain } from "../config/chains";
import { swapService } from "../services/swap.service";
import { tokenService } from "../services/token.service";
import { poolService } from "../services/pool.service";
import { marketService } from "../services/market.service";
import { fmtNumber, fmtPct, fmtUsd, shortAddress } from "@/lib/format";
import { TokenAvatar } from "@/components/swap/TokenSelectorModal";
import { useThemeStore } from "../store/themeStore";
import { Search, Database, ListCollapse, ShieldCheck, Info, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const directPublicClient = createPublicClient({
  chain: mstChain,
  transport: http("https://testnetrpc.mstblockchain.com"),
});

const tokenMetaCache = new Map<string, { symbol: string; decimals: number }>();

async function getTokenMeta(addr: string): Promise<{ symbol: string; decimals: number }> {
  const lowerAddr = addr.toLowerCase();
  const existing = TOKENS.find(t => t.symbol === "MST" ? false : t.address?.toLowerCase() === lowerAddr);
  if (existing) {
    return { symbol: existing.symbol, decimals: existing.decimals };
  }
  if (tokenMetaCache.has(lowerAddr)) {
    return tokenMetaCache.get(lowerAddr)!;
  }
  try {
    const [symbol, decimals] = await Promise.all([
      directPublicClient.readContract({
        address: addr as Address,
        abi: ABIS.erc20,
        functionName: "symbol"
      }),
      directPublicClient.readContract({
        address: addr as Address,
        abi: ABIS.erc20,
        functionName: "decimals"
      })
    ]);
    const meta = { symbol: symbol as string, decimals: Number(decimals) };
    tokenMetaCache.set(lowerAddr, meta);
    return meta;
  } catch (err) {
    console.error(`Error fetching meta for token ${addr}:`, err);
    const fallback = { symbol: "ERC20", decimals: 18 };
    tokenMetaCache.set(lowerAddr, fallback);
    return fallback;
  }
}

interface ExploreAnalytics {
  tvlUsd: number;
  volume24h: number;
  fees24h: number;
  activePairs: number;
  tvlDelta: number;
  volumeDelta: number;
  feesDelta: number;
  activePairsDelta: number;
  tokens: Array<{
    symbol: string;
    name: string;
    priceUsd: number;
    change24h: number;
    volume24h: number;
    tvl: number;
    address: string;
  }>;
  pools: Array<{
    address: string;
    token0: string;
    token1: string;
    feeTier: number;
    tvl: number;
    volume24h: number;
    apr: number;
    protocol: string;
  }>;
  transactions: Array<{
    hash: string;
    type: "swap" | "add" | "remove" | "wrap" | "unwrap";
    token0: string;
    token1: string;
    usd: number;
    account: string;
    timestamp: number;
    amountIn: number;
    amountOut: number;
  }>;
}

async function fetchExploreData(range: "1H" | "1D" | "1W" | "1M"): Promise<ExploreAnalytics> {
  const lpStateStorage = getContractAddress("lpStateStorage");
  const poolId = lpStateStorage ?
    (await directPublicClient.readContract({
      address: lpStateStorage,
      abi: ABIS.lpStateStorage,
      functionName: "poolAddress"
    }).catch(() => null)) : null;

  const targetPool = poolId || getContractAddress("pool");
  const wmstAddress = getContractAddress("wmst");
  const usdcAddress = getContractAddress("usdc");
  const usdcDecimals = TOKENS.find((t) => t.symbol === "USDC")?.decimals ?? 18;
  const wmstDecimals = TOKENS.find((t) => t.symbol === "WMST")?.decimals ?? 18;

  let liveMstPrice = 1.85;
  try {
    const slot0 = await directPublicClient.readContract({
      address: targetPool as Address,
      abi: ABIS.pool,
      functionName: "slot0"
    });
    if (slot0 && slot0[0] > 0n) {
      const poolSqrtPriceX96 = BigInt(slot0[0]);
      const Q96 = 2n ** 96n;
      const priceOfUsdcInWmst = (Number(poolSqrtPriceX96) / Number(Q96)) ** 2;
      if (priceOfUsdcInWmst > 0) {
        liveMstPrice = 1 / priceOfUsdcInWmst;
      }
    }
  } catch (err) {
    console.error("Error reading spot price from pool slot0 in explore page", err);
  }

  let wmstReserve = 0;
  let usdcReserve = 0;
  try {
    const [wmstBal, usdcBal] = await Promise.all([
      directPublicClient.readContract({
        address: wmstAddress,
        abi: ABIS.erc20,
        functionName: "balanceOf",
        args: [targetPool as Address]
      }),
      directPublicClient.readContract({
        address: usdcAddress,
        abi: ABIS.erc20,
        functionName: "balanceOf",
        args: [targetPool as Address]
      })
    ]);
    wmstReserve = Number(formatUnits(wmstBal as bigint, wmstDecimals));
    usdcReserve = Number(formatUnits(usdcBal as bigint, usdcDecimals));
  } catch (err) {
    console.error("Error reading pool reserves in explore page", err);
  }

  let backendSwaps: any[] = [];
  let backendTokens: any[] = [];
  let backendPools: any[] = [];
  let backendMarketData: any[] = [];
  let mintLogs: any[] = [];
  let burnLogs: any[] = [];
  let depositLogs: any[] = [];
  let withdrawalLogs: any[] = [];

  try {
    const latestBlock = await directPublicClient.getBlockNumber().catch(() => 0n);
    const fromBlock = latestBlock > 50000n ? latestBlock - 50000n : 0n;

    const [swapsRes, tokensRes, poolsRes, marketDataRes, mintLogsRes, burnLogsRes, depositLogsRes, withdrawalLogsRes] = await Promise.all([
      swapService.getSwaps().catch(() => []),
      tokenService.getTokens().catch(() => []),
      poolService.getPools().catch(() => []),
      marketService.getMarketData().catch(() => []),
      directPublicClient.getLogs({
        address: targetPool as Address,
        event: poolMintEvent,
        fromBlock,
        toBlock: "latest"
      }).catch(() => []),
      directPublicClient.getLogs({
        address: targetPool as Address,
        event: poolBurnEvent,
        fromBlock,
        toBlock: "latest"
      }).catch(() => []),
      directPublicClient.getLogs({
        address: wmstAddress as Address,
        event: wmstDepositEvent,
        fromBlock,
        toBlock: "latest"
      }).catch(() => []),
      directPublicClient.getLogs({
        address: wmstAddress as Address,
        event: wmstWithdrawalEvent,
        fromBlock,
        toBlock: "latest"
      }).catch(() => [])
    ]);

    backendSwaps = swapsRes;
    backendTokens = tokensRes;
    backendPools = poolsRes;
    backendMarketData = marketDataRes;
    mintLogs = mintLogsRes;
    burnLogs = burnLogsRes;
    depositLogs = depositLogsRes;
    withdrawalLogs = withdrawalLogsRes;
  } catch (err) {
    console.error("Error reading logs and backend data in explore page", err);
  }

  const txs: any[] = [];
  const isWmstToken0 = wmstAddress.toLowerCase() < usdcAddress.toLowerCase();

  const getPrice = (addr: string, symbol: string) => {
    const match = backendMarketData.find(m => m.tokenAddress.toLowerCase() === addr.toLowerCase());
    if (match) return match.price;
    if (symbol === "USDC") return 1.0;
    if (symbol === "WMST" || symbol === "MST") return liveMstPrice;
    return 0;
  };

  const now = Date.now();
  let rangeAgo = now - 24 * 60 * 60 * 1000;
  let rangePrecedingAgo = now - 48 * 60 * 60 * 1000;

  if (range === "1H") {
    rangeAgo = now - 1 * 60 * 60 * 1000;
    rangePrecedingAgo = now - 2 * 60 * 60 * 1000;
  } else if (range === "1D") {
    rangeAgo = now - 24 * 60 * 60 * 1000;
    rangePrecedingAgo = now - 48 * 60 * 60 * 1000;
  } else if (range === "1W") {
    rangeAgo = now - 7 * 24 * 60 * 60 * 1000;
    rangePrecedingAgo = now - 14 * 24 * 60 * 60 * 1000;
  } else if (range === "1M") {
    rangeAgo = now - 30 * 24 * 60 * 60 * 1000;
    rangePrecedingAgo = now - 60 * 24 * 60 * 60 * 1000;
  }

  let volumeRange = 0;
  let volumePrecedingRange = 0;

  for (const s of backendSwaps) {
    const tokenInMeta = TOKENS.find(t => t.address?.toLowerCase() === s.tokenIn.toLowerCase()) || backendTokens.find(t => t.tokenAddress.toLowerCase() === s.tokenIn.toLowerCase());
    const tokenOutMeta = TOKENS.find(t => t.address?.toLowerCase() === s.tokenOut.toLowerCase()) || backendTokens.find(t => t.tokenAddress.toLowerCase() === s.tokenOut.toLowerCase());
    const t0Symbol = tokenInMeta ? tokenInMeta.symbol : (s.tokenIn.toLowerCase() === wmstAddress.toLowerCase() ? "WMST" : "USDC");
    const t1Symbol = tokenOutMeta ? tokenOutMeta.symbol : (s.tokenOut.toLowerCase() === wmstAddress.toLowerCase() ? "WMST" : "USDC");

    const decIn = tokenInMeta?.decimals ?? 18;
    const decOut = tokenOutMeta?.decimals ?? 18;
    const amtIn = Number(formatUnits(BigInt(s.amountIn), decIn));
    const amtOut = Number(formatUnits(BigInt(s.amountOut), decOut));
    const usdValue = t0Symbol === "USDC" ? amtIn : (t1Symbol === "USDC" ? amtOut : amtIn * liveMstPrice);

    const swapTimestamp = new Date(s.createdAt).getTime();
    if (swapTimestamp >= rangeAgo) {
      volumeRange += usdValue;
    } else if (swapTimestamp >= rangePrecedingAgo) {
      volumePrecedingRange += usdValue;
    }

    txs.push({
      hash: s.txHash,
      type: "swap",
      token0: t0Symbol,
      token1: t1Symbol,
      usd: usdValue,
      account: s.walletAddress,
      timestamp: swapTimestamp,
      blockNumber: 0n,
      amountIn: amtIn,
      amountOut: amtOut
    });
  }

  for (const log of mintLogs) {
    const { amount0, amount1, owner } = log.args;
    if (amount0 !== undefined && amount1 !== undefined) {
      const wmstDec = isWmstToken0 ? amount0 : amount1;
      const usdcDec = isWmstToken0 ? amount1 : amount0;
      const wmstAmt = Number(formatUnits(wmstDec, wmstDecimals));
      const usdcAmt = Number(formatUnits(usdcDec, usdcDecimals));
      const usdValue = wmstAmt * liveMstPrice + usdcAmt;
      txs.push({ hash: log.transactionHash, blockNumber: log.blockNumber, type: "add", token0: "WMST", token1: "USDC", usd: usdValue, account: owner || "0x", timestamp: 0, amountIn: wmstAmt, amountOut: usdcAmt });
    }
  }

  for (const log of burnLogs) {
    const { amount0, amount1, owner } = log.args;
    if (amount0 !== undefined && amount1 !== undefined) {
      const wmstDec = isWmstToken0 ? amount0 : amount1;
      const usdcDec = isWmstToken0 ? amount1 : amount0;
      const wmstAmt = Number(formatUnits(wmstDec, wmstDecimals));
      const usdcAmt = Number(formatUnits(usdcDec, usdcDecimals));
      const usdValue = wmstAmt * liveMstPrice + usdcAmt;
      txs.push({ hash: log.transactionHash, blockNumber: log.blockNumber, type: "remove", token0: "WMST", token1: "USDC", usd: usdValue, account: owner || "0x", timestamp: 0, amountIn: wmstAmt, amountOut: usdcAmt });
    }
  }

  for (const log of depositLogs) {
    const { dst, wad } = log.args;
    if (wad !== undefined) {
      const wadAmt = Number(formatUnits(wad, wmstDecimals));
      const usdValue = wadAmt * liveMstPrice;
      txs.push({ hash: log.transactionHash, blockNumber: log.blockNumber, type: "wrap", token0: "tMST", token1: "WMST", usd: usdValue, account: dst || "0x", timestamp: 0, amountIn: wadAmt, amountOut: wadAmt });
    }
  }

  for (const log of withdrawalLogs) {
    const { src, wad } = log.args;
    if (wad !== undefined) {
      const wadAmt = Number(formatUnits(wad, wmstDecimals));
      const usdValue = wadAmt * liveMstPrice;
      txs.push({ hash: log.transactionHash, blockNumber: log.blockNumber, type: "unwrap", token0: "WMST", token1: "tMST", usd: usdValue, account: src || "0x", timestamp: 0, amountIn: wadAmt, amountOut: wadAmt });
    }
  }

  const txsNeedingTimestamp = txs.filter(t => t.timestamp === 0);
  const uniqueBlockNumbers = Array.from(new Set(txsNeedingTimestamp.map(t => t.blockNumber)));
  const blockTimestamps: Record<string, number> = {};
  await Promise.all(
    uniqueBlockNumbers.map(async (bn) => {
      try {
        const block = await directPublicClient.getBlock({ blockNumber: bn });
        blockTimestamps[bn.toString()] = Number(block.timestamp) * 1000;
      } catch {
        blockTimestamps[bn.toString()] = Date.now();
      }
    })
  );
  txs.forEach(t => {
    if (t.timestamp === 0) t.timestamp = blockTimestamps[t.blockNumber.toString()] || Date.now();
  });

  txs.sort((a, b) => b.timestamp - a.timestamp);
  const filteredTxs = txs.filter(t => t.timestamp >= rangeAgo);
  const recentTxs = filteredTxs.slice(0, 50);

  const getMstPriceAt = (targetTime: number): number => {
    const wmstAddrLower = wmstAddress.toLowerCase();
    const usdcAddrLower = usdcAddress.toLowerCase();
    const mstUsdcSwaps = backendSwaps.filter((s: any) =>
      (s.tokenIn.toLowerCase() === wmstAddrLower && s.tokenOut.toLowerCase() === usdcAddrLower) ||
      (s.tokenIn.toLowerCase() === usdcAddrLower && s.tokenOut.toLowerCase() === wmstAddrLower)
    );
    if (mstUsdcSwaps.length === 0) return liveMstPrice;
    const sorted = [...mstUsdcSwaps].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let targetSwap = sorted[0];
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (new Date(sorted[i].createdAt).getTime() <= targetTime) { targetSwap = sorted[i]; break; }
    }
    const decIn = targetSwap.tokenIn.toLowerCase() === usdcAddrLower ? usdcDecimals : 18;
    const decOut = targetSwap.tokenOut.toLowerCase() === usdcAddrLower ? usdcDecimals : 18;
    const amtIn = Number(formatUnits(BigInt(targetSwap.amountIn), decIn));
    const amtOut = Number(formatUnits(BigInt(targetSwap.amountOut), decOut));
    if (targetSwap.tokenIn.toLowerCase() === usdcAddrLower) return amtOut > 0 ? amtIn / amtOut : liveMstPrice;
    else return amtIn > 0 ? amtOut / amtIn : liveMstPrice;
  };

  const getTokenPriceAt = (tokenAddress: string, targetTime: number, currentPrice: number): number => {
    const lowerAddr = tokenAddress.toLowerCase();
    if (lowerAddr === usdcAddress.toLowerCase()) return 1.0;
    if (lowerAddr === wmstAddress.toLowerCase()) return getMstPriceAt(targetTime);
    const tokenSwaps = backendSwaps.filter((s: any) => s.tokenIn.toLowerCase() === lowerAddr || s.tokenOut.toLowerCase() === lowerAddr);
    if (tokenSwaps.length === 0) return currentPrice;
    const sorted = [...tokenSwaps].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let targetSwap = sorted[0];
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (new Date(sorted[i].createdAt).getTime() <= targetTime) { targetSwap = sorted[i]; break; }
    }
    const tokenInMeta = TOKENS.find(t => t.address?.toLowerCase() === targetSwap.tokenIn.toLowerCase()) || backendTokens.find(t => t.tokenAddress.toLowerCase() === targetSwap.tokenIn.toLowerCase());
    const tokenOutMeta = TOKENS.find(t => t.address?.toLowerCase() === targetSwap.tokenOut.toLowerCase()) || backendTokens.find(t => t.tokenAddress.toLowerCase() === targetSwap.tokenOut.toLowerCase());
    const decIn = tokenInMeta?.decimals ?? 18;
    const decOut = tokenOutMeta?.decimals ?? 18;
    const amtIn = Number(formatUnits(BigInt(targetSwap.amountIn), decIn));
    const amtOut = Number(formatUnits(BigInt(targetSwap.amountOut), decOut));
    const swapTime = new Date(targetSwap.createdAt).getTime();
    const mstPriceAtSwap = getMstPriceAt(swapTime);
    const t0Symbol = tokenInMeta ? tokenInMeta.symbol : (targetSwap.tokenIn.toLowerCase() === wmstAddress.toLowerCase() ? "WMST" : "USDC");
    const t1Symbol = tokenOutMeta ? tokenOutMeta.symbol : (targetSwap.tokenOut.toLowerCase() === wmstAddress.toLowerCase() ? "WMST" : "USDC");
    const usdValue = t0Symbol === "USDC" ? amtIn : (t1Symbol === "USDC" ? amtOut : amtIn * mstPriceAtSwap);
    const isTokenIn = targetSwap.tokenIn.toLowerCase() === lowerAddr;
    const amt = isTokenIn ? amtIn : amtOut;
    return amt > 0 ? usdValue / amt : currentPrice;
  };

  const tokenList: Array<{ symbol: string; name: string; priceUsd: number; change24h: number; volume24h: number; tvl: number; address: string }> = backendTokens.map((t) => {
    const match = backendMarketData.find(m => m.tokenAddress.toLowerCase() === t.tokenAddress.toLowerCase());

    if (match) {
      return {
        symbol: t.symbol,
        name: t.symbol === "USDC" ? "USD Coin" : (t.symbol === "WMST" ? "Wrapped MST" : t.symbol + " Native"),
        priceUsd: Number(match.price) || 0,
        change24h: Number(match.change24h) || 0,
        volume24h: Number(match.volume24h) || 0,
        tvl: Number(match.tvl) || 0,
        address: t.tokenAddress
      };
    }

    const priceUsd = getPrice(t.tokenAddress, t.symbol);
    const priceAtStart = getTokenPriceAt(t.tokenAddress, rangeAgo, priceUsd);
    const changeRange = priceAtStart > 0 ? ((priceUsd - priceAtStart) / priceAtStart) * 100 : 0;
    const tokenSwapsRange = backendSwaps.filter(s =>
      (s.tokenIn.toLowerCase() === t.tokenAddress.toLowerCase() || s.tokenOut.toLowerCase() === t.tokenAddress.toLowerCase()) &&
      new Date(s.createdAt).getTime() >= rangeAgo
    );
    const tokenVolume = tokenSwapsRange.reduce((sum, s) => {
      const tokenInMeta = backendTokens.find(tk => tk.tokenAddress.toLowerCase() === s.tokenIn.toLowerCase());
      const decIn = tokenInMeta ? tokenInMeta.decimals : 18;
      const amtIn = Number(formatUnits(BigInt(s.amountIn), decIn));
      const priceIn = getPrice(s.tokenIn, tokenInMeta?.symbol || "");
      return sum + amtIn * priceIn;
    }, 0);
    const tokenPools = backendPools.filter(p => p.token0Address.toLowerCase() === t.tokenAddress.toLowerCase() || p.token1Address.toLowerCase() === t.tokenAddress.toLowerCase());
    const tokenTvl = tokenPools.reduce((sum, p) => {
      const isToken0 = p.token0Address.toLowerCase() === t.tokenAddress.toLowerCase();
      const amt = isToken0 ? p.currentToken0Amount : p.currentToken1Amount;
      const formattedAmt = Number(formatUnits(BigInt(amt), t.decimals));
      return sum + formattedAmt * priceUsd;
    }, 0);
    return { symbol: t.symbol, name: t.symbol === "USDC" ? "USD Coin" : (t.symbol === "WMST" ? "Wrapped MST" : t.symbol + " Native"), priceUsd, change24h: changeRange, volume24h: tokenVolume, tvl: tokenTvl, address: t.tokenAddress };
  });

  const poolList: Array<{ address: string; token0: string; token1: string; feeTier: number; tvl: number; volume24h: number; apr: number; protocol: string }> = backendPools.map((p) => {
    const t0 = backendTokens.find(tk => tk.tokenAddress.toLowerCase() === p.token0Address.toLowerCase());
    const t1 = backendTokens.find(tk => tk.tokenAddress.toLowerCase() === p.token1Address.toLowerCase());
    const dec0 = t0 ? t0.decimals : 18;
    const dec1 = t1 ? t1.decimals : 18;
    const res0 = Number(formatUnits(BigInt(p.currentToken0Amount), dec0));
    const res1 = Number(formatUnits(BigInt(p.currentToken1Amount), dec1));
    const poolTvl = res0 * getPrice(p.token0Address, p.token0Symbol) + res1 * getPrice(p.token1Address, p.token1Symbol);
    const poolSwaps = backendSwaps.filter(s => s.poolAddress.toLowerCase() === p.poolAddress.toLowerCase() && new Date(s.createdAt).getTime() >= rangeAgo);
    const poolVolume = poolSwaps.reduce((sum, s) => {
      const tokenInMeta = backendTokens.find(tk => tk.tokenAddress.toLowerCase() === s.tokenIn.toLowerCase());
      const decIn = tokenInMeta ? tokenInMeta.decimals : 18;
      const amtIn = Number(formatUnits(BigInt(s.amountIn), decIn));
      const priceIn = getPrice(s.tokenIn, tokenInMeta?.symbol || "");
      return sum + amtIn * priceIn;
    }, 0);
    const totalFees = poolVolume * 0.003;
    let extrapolationFactor = 365;
    if (range === "1H") extrapolationFactor = 24 * 365;
    else if (range === "1W") extrapolationFactor = 52;
    else if (range === "1M") extrapolationFactor = 12;
    const aprVal = poolTvl > 0 ? (totalFees * extrapolationFactor / poolTvl) * 100 : 12.4;
    return { address: p.poolAddress, token0: p.token0Symbol, token1: p.token1Symbol, feeTier: p.feeTier, tvl: poolTvl, volume24h: poolVolume, apr: aprVal, protocol: p.protocol || "Rapidex V3" };
  });

  const tvlUsd = poolList.reduce((sum, pl) => sum + pl.tvl, 0) || wmstReserve * liveMstPrice + usdcReserve;
  const globalVolume24h = poolList.reduce((sum, pl) => sum + pl.volume24h, 0) || volumeRange;
  const fees24h = globalVolume24h * 0.003;
  const activePairs = poolList.length || 1;

  let tvlDeltaSum = 0;
  let totalTvlForDelta = 0;
  for (const t of tokenList) { tvlDeltaSum += t.tvl * t.change24h; totalTvlForDelta += t.tvl; }
  const tvlDelta = totalTvlForDelta > 0 ? Number((tvlDeltaSum / totalTvlForDelta).toFixed(2)) : 0.0;
  const volumeDelta = volumePrecedingRange > 0 ? Number((((volumeRange - volumePrecedingRange) / volumePrecedingRange) * 100).toFixed(2)) : 0.0;
  const feesDelta = volumeDelta;
  const newPoolsCount = backendPools.filter(p => new Date(p.createdAt).getTime() >= rangeAgo).length;
  const activePairsDelta = backendPools.length > 0 ? Number(((newPoolsCount / (backendPools.length - newPoolsCount || 1)) * 100).toFixed(2)) : 0.0;

  if (tokenList.length === 0) {
    tokenList.push(
      { symbol: "WMST", name: "Wrapped MST", priceUsd: liveMstPrice, change24h: 1.25, volume24h: globalVolume24h * 0.6, tvl: wmstReserve * liveMstPrice, address: wmstAddress },
      { symbol: "USDC", name: "USD Coin", priceUsd: 1.0, change24h: 0.0, volume24h: globalVolume24h * 0.4, tvl: usdcReserve, address: usdcAddress }
    );
  }

  if (poolList.length === 0) {
    poolList.push({ address: targetPool as string, token0: "WMST", token1: "USDC", feeTier: V3_FEE, tvl: tvlUsd, volume24h: globalVolume24h, apr: tvlUsd > 0 ? (fees24h * 365 / tvlUsd) * 100 : 12.4, protocol: "Rapidex V3" });
  }

  return { tvlUsd, volume24h: globalVolume24h, fees24h, activePairs, tvlDelta, volumeDelta, feesDelta, activePairsDelta, tokens: tokenList, pools: poolList, transactions: recentTxs };
}

const TABS = ["Tokens", "Pools", "Transactions", "Wallet Explorer"] as const;
const RANGES = ["1H", "1D", "1W", "1M"] as const;

interface TokenBalance {
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  address?: string;
}

interface ExplorerTx {
  hash: string;
  time: string;
  method: string;
  details: string;
}

export default function ExplorePage() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tokens");
  const [range, setRange] = useState<(typeof RANGES)[number]>("1D");

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["explore-analytics", range],
    queryFn: () => fetchExploreData(range),
    refetchInterval: 10_000
  });

  const publicClient = usePublicClient();
  const [addressInput, setAddressInput] = useState("");
  const [searchedAddress, setSearchedAddress] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [txHistory, setTxHistory] = useState<ExplorerTx[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleExplore() {
    setErrorMsg(null);
    setTokenBalances([]);
    setTxHistory([]);

    if (!isAddress(addressInput)) {
      setErrorMsg("Please enter a valid EVM address format.");
      return;
    }

    setIsSearching(true);
    setSearchedAddress(addressInput);

    try {
      const balances = await Promise.all(
        TOKENS.map(async (token) => {
          if (!token.address) return { ...token, balance: "0.0" };
          try {
            const rawBal = await directPublicClient.readContract({
              address: token.address,
              abi: ABIS.erc20,
              functionName: "balanceOf",
              args: [addressInput as Address]
            } as any);
            return { ...token, balance: formatUnits(rawBal as bigint, token.decimals) };
          } catch {
            return { ...token, balance: "0.0" };
          }
        })
      );
      setTokenBalances(balances);

      try {
        const nativeBalRaw = await directPublicClient.getBalance({ address: addressInput as Address });
        const nativeBal = { symbol: "MST", name: "Native MST", decimals: 18, balance: formatUnits(nativeBalRaw, 18) };
        setTokenBalances((prev) => [nativeBal, ...prev]);
      } catch { }

      const fromBlock = 2200000n;
      const [sentLogs, receivedLogs, approvalLogs] = await Promise.all([
        directPublicClient.getLogs({ event: erc20TransferEvent, args: { from: addressInput as Address }, fromBlock, toBlock: "latest" }).catch(() => []),
        directPublicClient.getLogs({ event: erc20TransferEvent, args: { to: addressInput as Address }, fromBlock, toBlock: "latest" }).catch(() => []),
        directPublicClient.getLogs({ event: erc20ApprovalEvent, args: { owner: addressInput as Address }, fromBlock, toBlock: "latest" }).catch(() => [])
      ]);

      const logsByHash: Record<string, any[]> = {};
      for (const log of [...sentLogs, ...receivedLogs, ...approvalLogs]) {
        if (!log.transactionHash) continue;
        if (!logsByHash[log.transactionHash]) logsByHash[log.transactionHash] = [];
        if (!logsByHash[log.transactionHash].some(l => l.logIndex === log.logIndex)) logsByHash[log.transactionHash].push(log);
      }

      const logsList = Object.entries(logsByHash).map(([hash, logs]) => {
        const minBlock = Math.min(...logs.map(l => Number(l.blockNumber || 0)));
        return { hash, logs, minBlock };
      }).sort((a, b) => b.minBlock - a.minBlock);

      const latestTxHashes = logsList.slice(0, 30);

      const parsedTxsRaw = await Promise.all(
        latestTxHashes.map(async ({ hash, logs: txLogs }) => {
          try {
            const sends = txLogs.filter(l => l.eventName === "Transfer" && l.args && (l.args as any).from?.toLowerCase() === addressInput.toLowerCase());
            const receives = txLogs.filter(l => l.eventName === "Transfer" && l.args && (l.args as any).to?.toLowerCase() === addressInput.toLowerCase());
            const approvals = txLogs.filter(l => l.eventName === "Approval" && l.args && (l.args as any).owner?.toLowerCase() === addressInput.toLowerCase());

            let method = "Transfer";
            let details = "";

            if (approvals.length > 0) {
              method = "Approval";
              const token = await getTokenMeta(approvals[0].address);
              const val = (approvals[0].args as any).value || 0n;
              const amount = Number(formatUnits(val, token.decimals));
              details = `${token.symbol} spend approved (${amount > 1000000000 ? "Max" : amount.toFixed(2)})`;
            } else {
              const wrapLog = receives.find(r => r.args && (r.args as any).from === '0x0000000000000000000000000000000000000000');
              const unwrapLog = sends.find(s => s.args && (s.args as any).to === '0x0000000000000000000000000000000000000000');

              if (wrapLog && wrapLog.address.toLowerCase() === getContractAddress("wmst").toLowerCase()) {
                method = "Swap";
                const amount = Number(formatUnits((wrapLog.args as any).value || 0n, 18));
                details = `${amount.toFixed(2)} MST ➜ ${amount.toFixed(2)} WMST`;
              } else if (unwrapLog && unwrapLog.address.toLowerCase() === getContractAddress("wmst").toLowerCase()) {
                method = "Swap";
                const amount = Number(formatUnits((unwrapLog.args as any).value || 0n, 18));
                details = `${amount.toFixed(2)} WMST ➜ ${amount.toFixed(2)} MST`;
              } else {
                const txObj = await directPublicClient.getTransaction({ hash: hash as Address }).catch(() => null);
                const toAddress = txObj?.to?.toLowerCase();
                const isLiquidityTx = txObj && toAddress && (
                  toAddress === getContractAddress("lpStateStorage").toLowerCase() ||
                  toAddress === getContractAddress("positionManager").toLowerCase()
                );

                if (isLiquidityTx) {
                  method = "Liquidity";
                  if (sends.length > 0) {
                    const parts = await Promise.all(sends.map(async s => (await getTokenMeta(s.address)).symbol));
                    details = `Add liquidity: ${parts.filter(Boolean).join(" + ") || "LP Deposit"}`;
                  } else if (receives.length > 0) {
                    const parts = await Promise.all(receives.map(async r => (await getTokenMeta(r.address)).symbol));
                    details = `Remove liquidity: ${parts.filter(Boolean).join(" + ") || "LP Withdrawal"}`;
                  } else {
                    details = "LP Interaction";
                  }
                } else if (sends.length > 0 && receives.length > 0) {
                  method = "Swap";
                  const sendToken = await getTokenMeta(sends[0].address);
                  const receiveToken = await getTokenMeta(receives[0].address);
                  if (sendToken && receiveToken) {
                    const sendAmt = Number(formatUnits((sends[0].args as any).value || 0n, sendToken.decimals));
                    const receiveAmt = Number(formatUnits((receives[0].args as any).value || 0n, receiveToken.decimals));
                    details = `${sendAmt.toFixed(2)} ${sendToken.symbol} ➜ ${receiveAmt.toFixed(2)} ${receiveToken.symbol}`;
                  } else {
                    details = "Swap Interaction";
                  }
                } else if (sends.length > 0) {
                  const sendToken = await getTokenMeta(sends[0].address);
                  if (sendToken) {
                    const isSwapToNative = txObj && txObj.to?.toLowerCase() === getContractAddress("swapRouter").toLowerCase();
                    if (isSwapToNative) {
                      method = "Swap";
                      const sendAmt = Number(formatUnits((sends[0].args as any).value || 0n, sendToken.decimals));
                      details = `${sendAmt.toFixed(2)} ${sendToken.symbol} ➜ MST`;
                    } else {
                      method = "Send";
                      const amt = Number(formatUnits((sends[0].args as any).value || 0n, sendToken.decimals));
                      details = `Send ${amt.toFixed(2)} ${sendToken.symbol}`;
                    }
                  }
                } else if (receives.length > 0) {
                  const receiveToken = await getTokenMeta(receives[0].address);
                  if (receiveToken) {
                    const nativeValueSent = txObj && txObj.from.toLowerCase() === addressInput.toLowerCase() ? Number(formatUnits(txObj.value, 18)) : 0;
                    if (nativeValueSent > 0) {
                      method = "Swap";
                      const receiveAmt = Number(formatUnits((receives[0].args as any).value || 0n, receiveToken.decimals));
                      details = `${nativeValueSent.toFixed(2)} MST ➜ ${receiveAmt.toFixed(2)} ${receiveToken.symbol}`;
                    } else {
                      method = "Receive";
                      const amt = Number(formatUnits((receives[0].args as any).value || 0n, receiveToken.decimals));
                      details = `Receive ${amt.toFixed(2)} ${receiveToken.symbol}`;
                    }
                  }
                } else {
                  method = "Contract Call";
                  details = txObj ? `Interaction with ${shortAddress(txObj.to || "", 6)}` : "Blockchain interaction";
                }
              }
            }

            let timestamp = Date.now();
            const firstLog = txLogs[0];
            if (firstLog && firstLog.blockNumber) {
              const block = await directPublicClient.getBlock({ blockNumber: firstLog.blockNumber }).catch(() => null);
              if (block && block.timestamp) timestamp = Number(block.timestamp) * 1000;
            }

            return { hash, time: new Date(timestamp).toLocaleString(), method, details };
          } catch (err) {
            console.error("Error parsing tx logs for hash " + hash, err);
            return null;
          }
        })
      );

      setTxHistory(parsedTxsRaw.filter((t): t is ExplorerTx => t !== null));
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to query data for this wallet.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="relative min-h-screen px-4 pb-20 pt-[104px] overflow-hidden font-sans">
      {/* ── Content scrim: dampens canvas glow bleed behind all content ── */}
      <div className="relative z-10">
        {/* Title Header */}
        <div className="mb-8 space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent uppercase font-sans">
            Market Analytics
          </h1>
          <p className={`text-sm font-light max-w-xl ${isDark ? "text-slate-300" : "text-zinc-600"}`}>
            Track real-time token valuations, liquidity pool volumes, and historical swap transaction activity.
          </p>
        </div>

        {/* Hero Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Hero
            label="TVL"
            value={analyticsLoading ? "..." : fmtUsd(analytics?.tvlUsd ?? 0)}
            delta={analytics?.tvlDelta ?? 0}
          />
          <Hero
            label={range === "1H" ? "1h Volume" : range === "1W" ? "7d Volume" : range === "1M" ? "30d Volume" : "24h Volume"}
            value={analyticsLoading ? "..." : fmtUsd(analytics?.volume24h ?? 0)}
            delta={analytics?.volumeDelta ?? 0}
          />
          <Hero
            label={range === "1H" ? "1h Fees" : range === "1W" ? "7d Fees" : range === "1M" ? "30d Fees" : "24h Fees"}
            value={analyticsLoading ? "..." : fmtUsd(analytics?.fees24h ?? 0)}
            delta={analytics?.feesDelta ?? 0}
          />
          <Hero
            label="Active pairs"
            value={analyticsLoading ? "..." : (analytics?.activePairs ?? 0).toString()}
            delta={analytics?.activePairsDelta ?? 0}
          />
        </div>

        {/* Tabs and Ranges Selection */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Tab pill bar — stronger bg so glow can't bleed through */}
          <div className={`flex items-center gap-1 rounded-full p-1 border transition-all duration-300
            ${isDark
              ? "bg-[#0d1220]/90 border-[#2C364F]/70 backdrop-blur-xl shadow-lg shadow-black/30"
              : "bg-zinc-100/95 border-zinc-200/80 backdrop-blur-xl shadow-sm"}`}
          >
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${tab === t
                  ? isDark
                    ? "bg-cyan-500/15 text-cyan-400 shadow-[0_8px_20px_-10px_rgba(6,182,212,0.5)] border border-cyan-500/30"
                    : "bg-white text-zinc-950 shadow-sm border border-zinc-200"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200 border border-transparent"
                    : "text-zinc-500 hover:text-zinc-800 border border-transparent"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Range pill bar — same treatment */}
          {tab !== "Wallet Explorer" && (
            <div className={`flex items-center gap-1 rounded-full p-1 border transition-all duration-300
              ${isDark
                ? "bg-[#0d1220]/90 border-[#2C364F]/70 backdrop-blur-xl shadow-lg shadow-black/30"
                : "bg-zinc-100/95 border-zinc-200/80 backdrop-blur-xl shadow-sm"}`}
            >
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${range === r
                    ? isDark
                      ? "bg-cyan-500/15 text-cyan-400 shadow-[0_8px_20px_-10px_rgba(6,182,212,0.5)] border border-cyan-500/30"
                      : "bg-white text-zinc-950 shadow-sm border border-zinc-200"
                    : isDark
                      ? "text-slate-400 hover:text-slate-200 border border-transparent"
                      : "text-zinc-500 hover:text-zinc-800 border border-transparent"
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === "Tokens" && (
          analyticsLoading ? (
            <div className={`p-8 text-center text-sm animate-pulse ${isDark ? "text-slate-400" : "text-zinc-600"}`}>Loading live tokens data...</div>
          ) : (
            <TokensTable rows={analytics?.tokens ?? []} range={range} />
          )
        )}
        {tab === "Pools" && (
          analyticsLoading ? (
            <div className={`p-8 text-center text-sm animate-pulse ${isDark ? "text-slate-400" : "text-zinc-600"}`}>Loading live pools data...</div>
          ) : (
            <PoolsTable rows={analytics?.pools ?? []} range={range} />
          )
        )}
        {tab === "Transactions" && (
          analyticsLoading ? (
            <div className={`p-8 text-center text-sm animate-pulse ${isDark ? "text-slate-400" : "text-zinc-600"}`}>Loading live transaction logs...</div>
          ) : (
            <TxTable rows={analytics?.transactions ?? []} />
          )
        )}
        {tab === "Wallet Explorer" && (
          <div className="space-y-8">
            {/* Search Bar */}
            <div className="flex gap-3 max-w-2xl">
              <input
                id="explorer-search-input"
                name="walletAddress"
                placeholder="Search address (0x...)"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className={`flex-1 rounded-xl px-4 py-3.5 outline-none transition ring-1 text-sm font-mono
                  ${isDark
                    ? "bg-[#0d1220]/90 border-slate-700 ring-slate-700/60 text-slate-100 placeholder:text-slate-500 focus:ring-cyan-500/40"
                    : "bg-white border-slate-200 ring-slate-200 text-slate-950 placeholder:text-slate-400 focus:ring-cyan-200"}`}
              />
              <button
                className={`rounded-xl px-6 py-3.5 font-bold uppercase tracking-wider text-xs text-white transition-all active:scale-[0.98] flex items-center gap-2
                  ${isSearching
                    ? "bg-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20 hover:brightness-110"
                  }`}
                onClick={handleExplore}
                disabled={isSearching}
              >
                <Search size={16} />
                {isSearching ? "Searching..." : "Explore"}
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-bold font-mono">{errorMsg}</p>
            )}

            {searchedAddress && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-[340px_1fr] gap-8 items-start"
              >
                {/* Asset list */}
                <div className={`p-5 rounded-3xl border shadow-deep backdrop-blur-2xl space-y-4
                  ${isDark ? "border-slate-700/70 bg-[#0a0f1e]/90 text-white" : "glass border-white/60 text-zinc-950"}`}
                >
                  <h3 className={`text-sm uppercase font-bold tracking-wider flex items-center gap-1.5 border-b pb-3
                    ${isDark ? "border-slate-800 text-cyan-400" : "border-slate-200 text-cyan-600"}`}
                  >
                    <Database size={14} />
                    Asset Holdings
                  </h3>
                  <div className="space-y-3">
                    {tokenBalances.map((token) => (
                      <div key={token.symbol} className={`p-3.5 rounded-xl border flex justify-between items-center text-xs
                        ${isDark ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50/70"}`}
                      >
                        <div>
                          <div className="font-bold">{token.symbol}</div>
                          <div className="text-[10px] text-muted-foreground font-light">{token.name}</div>
                        </div>
                        <div className="font-mono font-semibold">
                          {Number(token.balance).toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transactions log */}
                <div className={`p-5 rounded-3xl border shadow-deep backdrop-blur-2xl space-y-4
                  ${isDark ? "border-slate-700/70 bg-[#0a0f1e]/90 text-white" : "glass border-white/60 text-zinc-950"}`}
                >
                  <h3 className={`text-sm uppercase font-bold tracking-wider flex items-center gap-1.5 border-b pb-3
                    ${isDark ? "border-slate-800 text-cyan-400" : "border-slate-200 text-cyan-600"}`}
                  >
                    <ListCollapse size={14} />
                    Historical Transaction Log
                  </h3>
                  <div className="space-y-4">
                    {txHistory.map((tx) => (
                      <div key={tx.hash} className={`p-4 rounded-xl border space-y-2 text-xs
                        ${isDark ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50/70"}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{tx.method}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{tx.time}</span>
                        </div>
                        <div className={`text-[11px] font-mono flex justify-between items-center gap-4 ${isDark ? "text-slate-300" : "text-zinc-600"}`}>
                          <span>{tx.details}</span>
                          <a
                            href={`https://testnet.mstscan.com/tx/${tx.hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`hover:underline flex items-center gap-1 leading-none font-sans font-bold text-[10px]
                              ${isDark ? "text-cyan-300" : "text-cyan-600"}`}
                          >
                            MSTScan
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {!searchedAddress && !isSearching && (
              <div className={`p-12 text-center rounded-3xl border max-w-lg mx-auto space-y-4 shadow-float
                ${isDark ? "border-slate-800/80 bg-[#0a0f1e]/70" : "glass border-white/60 text-zinc-950"}`}
              >
                <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto">
                  <ShieldCheck size={24} />
                </div>
                <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-950"}`}>Ready to Audit</h3>
                <p className={`text-xs leading-relaxed font-light ${isDark ? "text-slate-400" : "text-zinc-600"}`}>
                  Enter any verified Metamask account address to index its token holdings and transaction histories directly from the MST Blockchain network.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Hero({ label, value, delta }: { label: string; value: string; delta: number }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div className={`rounded-3xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-float
      ${isDark
        ? "bg-[#0d1220]/85 border-[#2C364F]/60 text-white shadow-xl shadow-black/20 backdrop-blur-xl"
        : "glass border-white/60 text-zinc-950 shadow-md shadow-black/5"
      }`}
    >
      {/* FIX: label uses explicit slate-400/slate-500 instead of muted-foreground which can wash out */}
      <div className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-zinc-500"}`}>{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      <div className={`mt-1.5 text-xs font-semibold flex items-center gap-1 ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
        <span>{delta >= 0 ? "▲" : "▼"}</span>
        <span>{Math.abs(delta)}%</span>
      </div>
    </div>
  );
}

function TokensTable({ rows, range }: { rows: any[]; range: string }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const changeHeader = range === "1H" ? "1h Change" : range === "1W" ? "7d Change" : range === "1M" ? "30d Change" : "24h Change";
  const volumeHeader = range === "1H" ? "1h Volume" : range === "1W" ? "7d Volume" : range === "1M" ? "30d Volume" : "24h Volume";

  return (
    <ExploreTable head={["#", "Token", "Price", changeHeader, volumeHeader, "TVL"]}>
      {rows.map((t, i) => (
        <tr key={t.address} className={`transition-colors ${isDark ? "hover:bg-cyan-500/5" : "hover:bg-cyan-50/60"}`}>
          <Td className={`font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>{i + 1}</Td>
          <Td>
            <Link to={`/tokens/${t.address}`} className="flex items-center gap-3 group">
              <TokenAvatar symbol={t.symbol} />
              <div>
                <div className={`font-bold transition-colors group-hover:text-cyan-400 ${isDark ? "text-white" : "text-zinc-950"}`}>{t.symbol}</div>
                <div className={`text-xs font-light ${isDark ? "text-slate-400" : "text-slate-500"}`}>{t.name}</div>
              </div>
            </Link>
          </Td>
          <Td className={`font-semibold font-mono ${isDark ? "text-white" : "text-zinc-950"}`}>{fmtUsd(t.priceUsd)}</Td>
          <Td className={`font-semibold font-mono ${t.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtPct(t.change24h)}
          </Td>
          {/* FIX: explicit slate-200/zinc-700 so amount text is never washed out by canvas glow */}
          <Td className={`font-mono ${isDark ? "text-slate-200" : "text-zinc-700"}`}>{fmtUsd(t.volume24h, { compact: true })}</Td>
          <Td className={`font-mono ${isDark ? "text-slate-200" : "text-zinc-700"}`}>{fmtUsd(t.tvl, { compact: true })}</Td>
        </tr>
      ))}
    </ExploreTable>
  );
}

function PoolsTable({ rows, range }: { rows: any[]; range: string }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const volumeHeader = range === "1H" ? "Volume 1h" : range === "1W" ? "Volume 7d" : range === "1M" ? "Volume 30d" : "Volume 24h";

  return (
    <ExploreTable head={["#", "Pool", "Protocol", "Fee tier", "TVL", volumeHeader, "APR"]}>
      {rows.map((p, i) => (
        <tr key={p.address} className={`transition-colors ${isDark ? "hover:bg-cyan-500/5" : "hover:bg-cyan-50/60"}`}>
          <Td className={`font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>{i + 1}</Td>
          <Td>
            <Link to={`/pools/${p.address}`} className="flex items-center gap-3 group">
              <div className="flex -space-x-2.5">
                <TokenAvatar symbol={p.token0} />
                <TokenAvatar symbol={p.token1} />
              </div>
              <span className={`font-bold transition-colors group-hover:text-cyan-400 ${isDark ? "text-white" : "text-zinc-950"}`}>{p.token0} / {p.token1}</span>
            </Link>
          </Td>
          <Td className={`font-semibold uppercase font-mono text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>{p.protocol}</Td>
          <Td className="font-semibold">
            <span className={`rounded-lg border px-2.5 py-1 text-xs ${isDark ? "border-slate-700 bg-slate-800/80 text-slate-200" : "border-zinc-200 bg-zinc-100/80 text-zinc-700"}`}>
              {(p.feeTier / 10000).toFixed(2)}%
            </span>
          </Td>
          <Td className={`font-mono ${isDark ? "text-slate-200" : "text-zinc-700"}`}>{fmtUsd(p.tvl, { compact: true })}</Td>
          <Td className={`font-mono ${isDark ? "text-slate-200" : "text-zinc-700"}`}>{fmtUsd(p.volume24h, { compact: true })}</Td>
          <Td className={`font-bold font-mono ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{p.apr.toFixed(1)}%</Td>
        </tr>
      ))}
    </ExploreTable>
  );
}

function TxTable({ rows }: { rows: any[] }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <ExploreTable head={["Type", "Pair", "Amount (In ➜ Out)", "USD Amount", "Account", "Time"]}>
      {rows.map((t) => (
        <tr key={`${t.hash}-${t.type}-${t.timestamp}`} className={`transition-colors ${isDark ? "hover:bg-cyan-500/5" : "hover:bg-cyan-50/60"}`}>
          <Td>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border
                ${t.type === "swap"
                  ? isDark ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" : "bg-cyan-500/15 border-cyan-500/20 text-cyan-700"
                  : t.type === "add"
                    ? isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-emerald-500/15 border-emerald-500/20 text-emerald-700"
                    : t.type === "wrap"
                      ? isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300" : "bg-indigo-500/15 border-indigo-500/20 text-indigo-700"
                      : t.type === "unwrap"
                        ? isDark ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "bg-amber-500/15 border-amber-500/20 text-amber-700"
                        : isDark ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "bg-rose-500/15 border-rose-500/20 text-rose-700"
                }`}
            >
              {t.type}
            </span>
          </Td>
          <Td>
            <a href={`https://testnet.mstscan.com/tx/${t.hash}`} target="_blank" rel="noreferrer" className={`font-bold hover:text-cyan-400 transition-colors ${isDark ? "text-slate-100" : "text-zinc-950"}`}>
              {t.token0} → {t.token1}
            </a>
          </Td>
          {/* FIX: amount column uses slate-200 in dark so it's always readable against glow background */}
          <Td className={`font-mono text-xs ${isDark ? "text-slate-200" : "text-zinc-700"}`}>
            <div className="flex items-center gap-1.5">
              <span className="font-bold">{fmtNumber(t.amountIn, { max: 4 })}</span>
              <span className={`font-light ${isDark ? "text-slate-400" : "text-zinc-500"}`}>{t.token0}</span>
              <span className="text-cyan-400/70 font-light">➜</span>
              <span className="font-bold">{fmtNumber(t.amountOut, { max: 4 })}</span>
              <span className={`font-light ${isDark ? "text-slate-400" : "text-zinc-500"}`}>{t.token1}</span>
            </div>
          </Td>
          <Td className={`font-mono font-semibold ${isDark ? "text-white" : "text-zinc-950"}`}>{fmtUsd(t.usd)}</Td>
          <Td className={`font-mono text-xs transition-colors ${isDark ? "text-slate-400 hover:text-slate-100" : "text-slate-500 hover:text-zinc-950"}`}>
            <a href={`https://testnet.mstscan.com/address/${t.account}`} target="_blank" rel="noreferrer">
              {shortAddress(t.account, 6)}
            </a>
          </Td>
          <Td className={`font-light ${isDark ? "text-slate-400" : "text-slate-500"}`}>{timeAgo(t.timestamp)}</Td>
        </tr>
      ))}
    </ExploreTable>
  );
}

function ExploreTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div className={`overflow-hidden rounded-[2rem] border shadow-deep transition-all duration-300 backdrop-blur-xl
      ${isDark
        ? "bg-[#0d1220]/90 border-[#2C364F]/60 shadow-black/30"
        : "glass border-white/60 text-zinc-900 shadow-black/5"}`}
    >
      <div className="overflow-x-auto">
        <table className={`w-full text-xs sm:text-sm ${isDark ? "text-slate-100" : "text-zinc-900"}`}>
          <thead>
            {/* FIX: thead gets near-opaque bg so header labels are always crisp */}
            <tr className={`text-left text-[0.65rem] sm:text-xs uppercase tracking-[0.08em] sm:tracking-[0.18em] border-b font-bold
              ${isDark
                ? "border-[#2C364F]/60 bg-[#070d18]/95 text-slate-300"
                : "border-zinc-200/70 bg-zinc-50/90 text-zinc-500"}`}
            >
              {head.map((h) => (
                <th key={h} className="px-3 py-3 sm:px-5 sm:py-4 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          {/* FIX: row dividers are slightly more opaque so they show against glow bleed */}
          <tbody className={`divide-y font-medium ${isDark ? "divide-[#2C364F]/40" : "divide-zinc-200/50"}`}>
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 sm:px-5 sm:py-4 whitespace-nowrap ${className}`}>{children}</td>;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}