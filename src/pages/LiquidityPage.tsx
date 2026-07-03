import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Plus, Coins, HelpCircle, ExternalLink, ChevronDown, ChevronUp, ArrowLeft, ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { formatUnits, parseUnits, type Address, decodeEventLog } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract, useBalance } from "wagmi";
import { getToken, TOKENS, CONTRACTS, erc20Abi, quoterV2Abi, nonfungiblePositionManagerAbi, rapidexV3FactoryAbi, poolAbi, V3_FEE, ZERO_SQRT_PRICE_LIMIT, type TokenConfig, NATIVE_TOKEN_SYMBOL } from "../config/contracts";
import { ABIS } from "../config";
import { mstChain } from "../config/chains";
import { TokenLogo } from "../components/swap/TokenLogos";
import { MstTokenModal } from "../components/swap/MstTokenModal";
import { useThemeStore } from "../store/themeStore";
import { getAmountsForLiquidity, getOtherAmountForToken, tickToPrice, priceToTick } from "../utils/rapidex-math";
import { poolService } from "../services/pool.service";
import { liquidityService } from "../services/liquidity.service";
import { lpPositionService } from "../services/lp-position.service";
import { useTokens } from "../hooks/api";
import { useQueryClient } from "@tanstack/react-query";
import { usePortfolioStore } from "../features/portfolio/store/portfolio-store";

export interface PositionItem {
  tokenId: bigint;
  liquidity: bigint;
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
  poolAddress: Address;
  amount0: bigint;
  amount1: bigint;
  isInRange: boolean;
  token0Info: TokenConfig;
  token1Info: TokenConfig;
  poolSqrtPriceX96: bigint;
}

const onchainTokenMetaCache = new Map<string, TokenConfig>();

async function getOnchainTokenInfo(
  publicClient: ReturnType<typeof usePublicClient>,
  address: Address
): Promise<TokenConfig> {
  const lowerAddr = address.toLowerCase();
  if (onchainTokenMetaCache.has(lowerAddr)) {
    return onchainTokenMetaCache.get(lowerAddr)!;
  }
  try {
    const [symbol, name, decimals] = await Promise.all([
      publicClient!.readContract({ address, abi: ABIS.erc20, functionName: "symbol" }),
      publicClient!.readContract({ address, abi: ABIS.erc20, functionName: "name" }),
      publicClient!.readContract({ address, abi: ABIS.erc20, functionName: "decimals" }),
    ]);
    const info: TokenConfig = {
      symbol: symbol as string,
      name: name as string,
      decimals: Number(decimals),
      address,
    } as TokenConfig;
    onchainTokenMetaCache.set(lowerAddr, info);
    return info;
  } catch (err) {
    console.error(`Error fetching on-chain token info for ${address}:`, err);
    const fallback = { symbol: "ERC20", name: "Unknown Token", decimals: 18, address } as TokenConfig;
    onchainTokenMetaCache.set(lowerAddr, fallback);
    return fallback;
  }
}

function formatToPrecision(value: number, decimals: number): string {
  if (isNaN(value) || !isFinite(value)) return "";
  if (value === 0) return "0";
  const maxDecimals = Math.min(decimals, 18);
  let str = value.toFixed(maxDecimals);
  // Remove trailing zeros and trailing decimal point
  str = str.replace(/\.?0+$/, "");
  return str;
}

const poolAddressCache = new Map<string, string>();

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const curIndex = index++;
      try {
        results[curIndex] = await fn(items[curIndex]);
      } catch (err) {
        console.error(`Error in mapWithLimit at index ${curIndex}:`, err);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export default function LiquidityPage() {
  const { theme } = useThemeStore();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: dbTokens } = useTokens();
  const queryClient = useQueryClient();

  const [tokenA_Symbol, setTokenA_Symbol] = useState("");
  const [tokenB_Symbol, setTokenB_Symbol] = useState("");
  const [modalOpen, setModalOpen] = useState<"A" | "B" | null>(null);

  const handleTokenSelect = (symbol: string) => {
    setRangeStrategy("stable");
    setRangeMode("custom");
    if (modalOpen === "A") {
      if (tokenB_Symbol && symbol === tokenB_Symbol) {
        setTokenB_Symbol(tokenA_Symbol);
      }
      setTokenA_Symbol(symbol);
    } else if (modalOpen === "B") {
      if (tokenA_Symbol && symbol === tokenA_Symbol) {
        setTokenA_Symbol(tokenB_Symbol);
      }
      setTokenB_Symbol(symbol);
    }
  };

  const wmstToken = useMemo(() => {
    // Priority: hardcoded core tokens to ensure correct testnet balances
    if (tokenA_Symbol === "USDC") return { symbol: "USDC", name: "USD Coin", decimals: 18, address: CONTRACTS.usdc };
    if (tokenA_Symbol === "WMST") return { symbol: "WMST", name: "Wrapped MST", decimals: 18, address: CONTRACTS.wmst };

    if (dbTokens && dbTokens.length > 0) {
      const match = dbTokens.find(t => t.symbol.toLowerCase() === tokenA_Symbol.toLowerCase());
      if (match) {
        return {
          symbol: match.symbol,
          name: match.symbol + " Token",
          decimals: match.decimals,
          address: match.tokenAddress as Address
        };
      }
    }
    return getToken(tokenA_Symbol) || { symbol: tokenA_Symbol, decimals: 18, address: undefined };
  }, [tokenA_Symbol, dbTokens]);

  const usdcToken = useMemo(() => {
    // Priority: hardcoded core tokens to ensure correct testnet balances
    if (tokenB_Symbol === "USDC") return { symbol: "USDC", name: "USD Coin", decimals: 18, address: CONTRACTS.usdc };
    if (tokenB_Symbol === "WMST") return { symbol: "WMST", name: "Wrapped MST", decimals: 18, address: CONTRACTS.wmst };

    if (dbTokens && dbTokens.length > 0) {
      const match = dbTokens.find(t => t.symbol.toLowerCase() === tokenB_Symbol.toLowerCase());
      if (match) {
        return {
          symbol: match.symbol,
          name: match.symbol + " Token",
          decimals: match.decimals,
          address: match.tokenAddress as Address
        };
      }
    }
    return getToken(tokenB_Symbol) || { symbol: tokenB_Symbol, decimals: 18, address: undefined };
  }, [tokenB_Symbol, dbTokens]);

  // 1. Fetch live balances
  const [wmstBalance, setWmstBalance] = useState("0.00");
  const [usdcBalance, setUsdcBalance] = useState("0.00");

  // LP State Stored Values (List-based)
  const [positions, setPositions] = useState<PositionItem[] | null>(null);
  const [expandedTokenId, setExpandedTokenId] = useState<bigint | null>(null);
  const [feeFilter, setFeeFilter] = useState<number | "all">("all");
  const [sortBy, setSortBy] = useState<"tokenId-desc" | "tokenId-asc" | "value-desc" | "value-asc" | "status">("tokenId-desc");

  // View state: 'list' dashboard vs 'create' pool creator wizard
  const [currentView, setCurrentView] = useState<"list" | "create">("list");

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const viewParam = queryParams.get("view");

  useEffect(() => {
    if (viewParam === "create") {
      setCurrentView("create");
    } else if (viewParam === "list") {
      setCurrentView("list");
    }
  }, [viewParam]);

  // Price references
  const [liveMstPrice, setLiveMstPrice] = useState<number>(0);

  const getTokenPrice = (symbol: string) => {
    return symbol === "USDC" ? 1.0 : (symbol === "WMST" || symbol === "MST" ? liveMstPrice : 0.0);
  };

  // Summing reserves and counts dynamically
  const portfolioStats = useMemo(() => {
    if (!positions || positions.length === 0) return { totalUSD: 0, activeCount: 0, positionsCount: 0 };
    let total = 0;
    let active = 0;
    positions.forEach((pos) => {
      const token0Symbol = pos.token0Info.symbol;
      const token1Symbol = pos.token1Info.symbol;

      const amt0Formatted = Number(formatUnits(pos.amount0, pos.token0Info.decimals));
      const amt1Formatted = Number(formatUnits(pos.amount1, pos.token1Info.decimals));

      const val0 = amt0Formatted * getTokenPrice(token0Symbol);
      const val1 = amt1Formatted * getTokenPrice(token1Symbol);

      total += (val0 + val1);
      if (pos.isInRange) active++;
    });
    return {
      totalUSD: total,
      activeCount: active,
      positionsCount: positions.length
    };
  }, [positions, liveMstPrice]);

  const processedPositions = useMemo(() => {
    if (!positions) return null;

    // 1. Filter
    let filtered = positions;
    if (feeFilter !== "all") {
      filtered = filtered.filter((pos) => pos.fee === feeFilter);
    }

    // 2. Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === "tokenId-desc") {
        return Number(b.tokenId - a.tokenId);
      }
      if (sortBy === "tokenId-asc") {
        return Number(a.tokenId - b.tokenId);
      }
      if (sortBy === "value-desc" || sortBy === "value-asc") {
        const valA = (Number(formatUnits(a.amount0, a.token0Info.decimals)) * getTokenPrice(a.token0Info.symbol)) +
          (Number(formatUnits(a.amount1, a.token1Info.decimals)) * getTokenPrice(a.token1Info.symbol));
        const valB = (Number(formatUnits(b.amount0, b.token0Info.decimals)) * getTokenPrice(b.token0Info.symbol)) +
          (Number(formatUnits(b.amount1, b.token1Info.decimals)) * getTokenPrice(b.token1Info.symbol));
        return sortBy === "value-desc" ? valB - valA : valA - valB;
      }
      if (sortBy === "status") {
        return (a.isInRange ? 0 : 1) - (b.isInRange ? 0 : 1);
      }
      return 0;
    });
  }, [positions, feeFilter, sortBy, liveMstPrice]);

  // Input states for Creating / Initializing Pool
  const [initFee, setInitFee] = useState<number>(3000); // 0.3%
  const [initWmst, setInitWmst] = useState("");
  const [initUsdc, setInitUsdc] = useState("");
  const [lastEdited, setLastEdited] = useState<"A" | "B" | null>(null);
  const [initTickLower, setInitTickLower] = useState("-887220");
  const [initTickUpper, setInitTickUpper] = useState("887220");

  const [rangeMode, setRangeMode] = useState<"custom" | "full">("custom");
  const [rangeStrategy, setRangeStrategy] = useState<"stable" | "wide" | "custom" | "full">("stable");
  const [priceLower, setPriceLower] = useState("");
  const [priceUpper, setPriceUpper] = useState("");

  const isToken0A = useMemo(() => {
    const addrA = wmstToken.address;
    const addrB = usdcToken.address;
    if (!addrA || !addrB) return true;
    return addrA.toLowerCase() < addrB.toLowerCase();
  }, [wmstToken.address, usdcToken.address]);

  // Input states for Adding Liquidity (scoped to expanded position card via common state cleared on expansion change)
  const [addAmount0, setAddAmount0] = useState("");
  const [addAmount1, setAddAmount1] = useState("");

  // Input states for Removing Liquidity
  const [removePercent, setRemovePercent] = useState<number>(50); // 50% default

  // Transaction Working States
  const [isWorking, setIsWorking] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [txHash, setTxHash] = useState("");
  const [pendingAction, setPendingAction] = useState<"create" | "add" | "remove" | null>(null);

  // Step-by-step pool initialization states
  const [createSteps, setCreateSteps] = useState<any[]>([]);
  const [activeCreateStepIndex, setActiveCreateStepIndex] = useState<number>(0);
  const [loadingCreateSteps, setLoadingCreateSteps] = useState<boolean>(false);

  const isDark = theme === "dark";

  const [isPoolInitialized, setIsPoolInitialized] = useState<boolean>(false);
  const [poolCurrentPrice, setPoolCurrentPrice] = useState<number | null>(null);
  const [poolSqrtPriceX96, setPoolSqrtPriceX96] = useState<bigint | null>(null);
  const [creationMode, setCreationMode] = useState<"new" | "existing">("new");
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (currentView !== "create") {
      setWizardStep(1);
    }
  }, [currentView]);

  const [quoterPrice, setQuoterPrice] = useState<number | null>(null);
  const [quoterAmountB, setQuoterAmountB] = useState<string>("");
  const [quoterAmountA, setQuoterAmountA] = useState<string>("");

  useEffect(() => {
    let active = true;
    if (!publicClient || !tokenA_Symbol || !tokenB_Symbol || !isPoolInitialized) {
      setQuoterPrice(null);
      return;
    }

    const fetchQuoterPrice = async () => {
      try {
        const wAddress = wmstToken.address;
        const uAddress = usdcToken.address;
        if (!wAddress || !uAddress) return;

        const oneUnitRaw = parseUnits("1", wmstToken.decimals);
        const { result } = await publicClient.simulateContract({
          address: CONTRACTS.quoterV2,
          abi: quoterV2Abi,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn: wAddress,
              tokenOut: uAddress,
              amountIn: oneUnitRaw,
              fee: initFee,
              sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
            }
          ]
        });
        if (!active) return;
        const amountOut = (result as any)[0] as bigint;
        const price = Number(formatUnits(amountOut, usdcToken.decimals));
        setQuoterPrice(price);
      } catch (err) {
        if (active) setQuoterPrice(null);
      }
    };

    fetchQuoterPrice();
    return () => {
      active = false;
    };
  }, [tokenA_Symbol, tokenB_Symbol, initFee, isPoolInitialized, publicClient]);

  useEffect(() => {
    let active = true;
    if (!publicClient || !tokenA_Symbol || !tokenB_Symbol || !initWmst || isNaN(Number(initWmst)) || Number(initWmst) <= 0 || !isPoolInitialized) {
      setQuoterAmountB("");
      return;
    }

    const fetchQuote = async () => {
      try {
        const wAddress = wmstToken.address;
        const uAddress = usdcToken.address;
        if (!wAddress || !uAddress) return;

        const amountInRaw = parseUnits(initWmst, wmstToken.decimals);
        const { result } = await publicClient.simulateContract({
          address: CONTRACTS.quoterV2,
          abi: quoterV2Abi,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn: wAddress,
              tokenOut: uAddress,
              amountIn: amountInRaw,
              fee: initFee,
              sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
            }
          ]
        });
        if (!active) return;
        const amountOut = (result as any)[0] as bigint;
        const formatted = formatUnits(amountOut, usdcToken.decimals);
        setQuoterAmountB(Number(formatted).toFixed(4));
      } catch (err) {
        if (active) setQuoterAmountB("");
      }
    };

    fetchQuote();
    return () => {
      active = false;
    };
  }, [initWmst, tokenA_Symbol, tokenB_Symbol, initFee, isPoolInitialized, publicClient]);

  useEffect(() => {
    let active = true;
    if (!publicClient || !tokenA_Symbol || !tokenB_Symbol || !initUsdc || isNaN(Number(initUsdc)) || Number(initUsdc) <= 0 || !isPoolInitialized) {
      setQuoterAmountA("");
      return;
    }

    const fetchQuote = async () => {
      try {
        const wAddress = wmstToken.address;
        const uAddress = usdcToken.address;
        if (!wAddress || !uAddress) return;

        const amountInRaw = parseUnits(initUsdc, usdcToken.decimals);
        const { result } = await publicClient.simulateContract({
          address: CONTRACTS.quoterV2,
          abi: quoterV2Abi,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn: uAddress,
              tokenOut: wAddress,
              amountIn: amountInRaw,
              fee: initFee,
              sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
            }
          ]
        });
        if (!active) return;
        const amountOut = (result as any)[0] as bigint;
        const formatted = formatUnits(amountOut, wmstToken.decimals);
        setQuoterAmountA(Number(formatted).toFixed(4));
      } catch (err) {
        if (active) setQuoterAmountA("");
      }
    };

    fetchQuote();
    return () => {
      active = false;
    };
  }, [initUsdc, tokenA_Symbol, tokenB_Symbol, initFee, isPoolInitialized, publicClient]);
  const formatCurrency = (valUSD: number) => {
    return `$${valUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getRefPrice = () => {
    if (creationMode === "existing" && poolCurrentPrice !== null) {
      return poolCurrentPrice;
    }
    const wAmt = Number(initWmst);
    const uAmt = Number(initUsdc);
    if (wAmt > 0 && uAmt > 0) {
      return uAmt / wAmt;
    }
    return 1.0;
  };

  const getDeviation = (priceStr: string) => {
    const currentPrice = getRefPrice();
    if (currentPrice <= 0) return "";
    const price = Number(priceStr);
    if (isNaN(price) || price <= 0) return "";
    const dev = ((price - currentPrice) / currentPrice) * 100;
    if (dev === 0) return "0%";
    return (dev > 0 ? "+" : "") + dev.toFixed(2) + "%";
  };

  const getDeviationLabel = (isLower: boolean) => {
    if (rangeMode === "full") {
      return isLower ? "-100%" : "+∞%";
    }
    const priceStr = isLower ? priceLower : priceUpper;
    return getDeviation(priceStr);
  };

  const updateTicksFromStrategy = (
    strategy: "stable" | "wide" | "custom" | "full",
    fee: number,
    refPrice: number
  ) => {
    const spacing = getTickSpacing(fee);
    const minTick = Math.ceil(-887272 / spacing) * spacing;
    const maxTick = Math.floor(887272 / spacing) * spacing;

    if (strategy === "full") {
      setInitTickLower(minTick.toString());
      setInitTickUpper(maxTick.toString());
      setPriceLower("0");
      setPriceUpper("Infinity");
      return;
    }

    if (refPrice <= 0) return;

    const currentTick = priceToTick(refPrice, wmstToken.decimals, usdcToken.decimals, isToken0A);
    const currentTickAligned = Math.round(currentTick / spacing) * spacing;

    let lowerTick = currentTickAligned;
    let upperTick = currentTickAligned;

    if (strategy === "stable") {
      lowerTick = currentTickAligned - 3 * spacing;
      upperTick = currentTickAligned + 3 * spacing;
    } else if (strategy === "wide") {
      const pLower = refPrice * 0.5;
      const pUpper = refPrice * 2.0;
      const t1 = priceToTick(pLower, wmstToken.decimals, usdcToken.decimals, isToken0A);
      const t2 = priceToTick(pUpper, wmstToken.decimals, usdcToken.decimals, isToken0A);
      lowerTick = Math.min(t1, t2);
      upperTick = Math.max(t1, t2);
      lowerTick = Math.round(lowerTick / spacing) * spacing;
      upperTick = Math.round(upperTick / spacing) * spacing;
    } else {
      return;
    }

    if (lowerTick < minTick) lowerTick = minTick;
    if (upperTick > maxTick) upperTick = maxTick;
    if (lowerTick >= upperTick) {
      lowerTick = upperTick - spacing;
    }

    setInitTickLower(lowerTick.toString());
    setInitTickUpper(upperTick.toString());

    const p1 = tickToPrice(lowerTick, wmstToken.decimals, usdcToken.decimals, isToken0A);
    const p2 = tickToPrice(upperTick, wmstToken.decimals, usdcToken.decimals, isToken0A);
    const minPrice = Math.min(p1, p2);
    const maxPrice = Math.max(p1, p2);
    setPriceLower(minPrice.toFixed(4));
    setPriceUpper(maxPrice.toFixed(4));
  };

  useEffect(() => {
    if (!tokenA_Symbol || !tokenB_Symbol) return;
    const refPrice = getRefPrice();
    if (rangeMode === "full") {
      updateTicksFromStrategy("full", initFee, refPrice);
    } else {
      updateTicksFromStrategy(rangeStrategy, initFee, refPrice);
    }
  }, [rangeMode, rangeStrategy, initFee, tokenA_Symbol, tokenB_Symbol, poolCurrentPrice, creationMode, initWmst, initUsdc]);

  const handlePriceLowerChange = (val: string) => {
    setPriceLower(val);
    setRangeStrategy("custom");
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      const tick = priceToTick(num, wmstToken.decimals, usdcToken.decimals, isToken0A);
      const spacing = getTickSpacing(initFee);
      const aligned = Math.round(tick / spacing) * spacing;
      if (isToken0A) {
        setInitTickLower(aligned.toString());
      } else {
        setInitTickUpper(aligned.toString());
      }
    }
  };

  const handlePriceUpperChange = (val: string) => {
    setPriceUpper(val);
    setRangeStrategy("custom");
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      const tick = priceToTick(num, wmstToken.decimals, usdcToken.decimals, isToken0A);
      const spacing = getTickSpacing(initFee);
      const aligned = Math.round(tick / spacing) * spacing;
      if (isToken0A) {
        setInitTickUpper(aligned.toString());
      } else {
        setInitTickLower(aligned.toString());
      }
    }
  };

  const handlePriceLowerBlur = () => {
    const tick = Number(isToken0A ? initTickLower : initTickUpper);
    if (!isNaN(tick)) {
      const snappedPrice = tickToPrice(tick, wmstToken.decimals, usdcToken.decimals, isToken0A);
      setPriceLower(snappedPrice.toFixed(4));
    }
  };

  const handlePriceUpperBlur = () => {
    const tick = Number(isToken0A ? initTickUpper : initTickLower);
    if (!isNaN(tick)) {
      const snappedPrice = tickToPrice(tick, wmstToken.decimals, usdcToken.decimals, isToken0A);
      setPriceUpper(snappedPrice.toFixed(4));
    }
  };

  const getEstimatedLiquidityAndAPR = () => {
    const wAmt = Number(initWmst);
    const uAmt = Number(initUsdc);
    if (isNaN(wAmt) || wAmt <= 0 || isNaN(uAmt) || uAmt <= 0) return { apr: 0, dailyFee: 0, userDepositUSD: 0 };

    const currentPrice = getRefPrice();
    const lowerPrice = rangeMode === "full" ? 0.0001 : Number(priceLower) || 0.0001;
    const upperPrice = rangeMode === "full" ? 1000000000 : Number(priceUpper) || 1000000000;

    const sqrtPc = Math.sqrt(currentPrice);
    const sqrtPa = Math.sqrt(lowerPrice);
    const sqrtPb = Math.sqrt(upperPrice);

    let L = 0;
    if (currentPrice < lowerPrice) {
      L = wAmt / (1 / sqrtPa - 1 / sqrtPb);
    } else if (currentPrice > upperPrice) {
      L = uAmt / (sqrtPb - sqrtPa);
    } else {
      const Lx = wAmt / (1 / sqrtPc - 1 / sqrtPb);
      const Ly = uAmt / (sqrtPc - sqrtPa);
      L = Math.min(Lx, Ly);
    }

    if (L <= 0 || isNaN(L)) return { apr: 0, dailyFee: 0, userDepositUSD: 0 };

    let dailyVolume = 250000;
    if (initFee === 500) dailyVolume = 50000;
    else if (initFee === 10000) dailyVolume = 15000;

    const feePercent = initFee / 1000000;
    const poolVolumeFee = dailyVolume * feePercent;

    const userDepositUSD = (wAmt * getTokenPrice(tokenA_Symbol)) + (uAmt * getTokenPrice(tokenB_Symbol));
    if (userDepositUSD <= 0) return { apr: 0, dailyFee: 0, userDepositUSD: 0 };

    const poolTVL = 150000;
    const userShare = userDepositUSD / (poolTVL + userDepositUSD);
    const dailyFee = poolVolumeFee * userShare;
    const yearlyFee = dailyFee * 365;
    const apr = (yearlyFee / userDepositUSD) * 100;

    return {
      apr: isFinite(apr) ? apr : 0,
      dailyFee: isFinite(dailyFee) ? dailyFee : 0,
      userDepositUSD
    };
  };

  const isTokenInputDisabled = (isTokenA: boolean) => {
    if (!isPoolInitialized || poolCurrentPrice === null) return false;
    const pLower = rangeMode === "full" ? 0 : Number(priceLower) || 0;
    const pUpper = rangeMode === "full" ? Infinity : Number(priceUpper) || Infinity;

    if (isToken0A) {
      if (isTokenA) {
        return poolCurrentPrice > pUpper;
      } else {
        return poolCurrentPrice < pLower;
      }
    } else {
      if (isTokenA) {
        return poolCurrentPrice < pLower;
      } else {
        return poolCurrentPrice > pUpper;
      }
    }
  };

  useEffect(() => {
    if (isTokenInputDisabled(true)) {
      setInitWmst("0");
    }
    if (isTokenInputDisabled(false)) {
      setInitUsdc("0");
    }
  }, [priceLower, priceUpper, poolCurrentPrice, isPoolInitialized]);

  const getTickSpacing = (fee: number): number => {
    if (fee === 100) return 1;
    if (fee === 500) return 10;
    if (fee === 3000) return 60;
    if (fee === 10000) return 200;
    return 60;
  };

  const alignTick = (tickStr: string | number, fee: number): number => {
    const tick = Number(tickStr);
    if (isNaN(tick)) return 0;
    const spacing = getTickSpacing(fee);
    let aligned = Math.round(tick / spacing) * spacing;
    const minTick = Math.ceil(-887272 / spacing) * spacing;
    const maxTick = Math.floor(887272 / spacing) * spacing;
    if (aligned < minTick) aligned = minTick;
    if (aligned > maxTick) aligned = maxTick;
    return aligned;
  };

  const getV3Amounts = (val: string, inputSymbol: string): string => {
    if (!val || isNaN(Number(val)) || Number(val) < 0) return "";
    if (!isPoolInitialized || !poolSqrtPriceX96) return "";

    try {
      const lowerTick = alignTick(initTickLower, initFee);
      const upperTick = alignTick(initTickUpper, initFee);
      if (isNaN(lowerTick) || isNaN(upperTick)) return "";

      const wAddress = wmstToken.address as Address;
      const uAddress = usdcToken.address as Address;
      if (!wAddress || !uAddress) return "";
      const isWmstToken0 = wAddress.toLowerCase() < uAddress.toLowerCase();

      const inputDecimals = inputSymbol === tokenA_Symbol ? wmstToken.decimals : usdcToken.decimals;
      const amountRaw = parseUnits(val, inputDecimals);

      const isInputToken0 = inputSymbol === tokenA_Symbol ? isWmstToken0 : !isWmstToken0;
      const inputTokenIndex = isInputToken0 ? 0 : 1;

      // Swap and invert tick bounds if token order is swapped on-chain
      let calcTickLower = lowerTick;
      let calcTickUpper = upperTick;
      if (!isWmstToken0) {
        calcTickLower = -upperTick;
        calcTickUpper = -lowerTick;
      }

      const otherAmountRaw = getOtherAmountForToken(
        amountRaw,
        inputTokenIndex,
        poolSqrtPriceX96,
        calcTickLower,
        calcTickUpper
      );

      const otherDecimals = inputSymbol === tokenA_Symbol ? usdcToken.decimals : wmstToken.decimals;
      const parsedNum = Number(formatUnits(otherAmountRaw, otherDecimals));
      return formatToPrecision(parsedNum, otherDecimals);
    } catch (err) {
      console.error("Error calculating V3 amounts", err);
      return "";
    }
  };

  useEffect(() => {
    if (creationMode === "existing" && isPoolInitialized && poolSqrtPriceX96) {
      if (lastEdited === "A" && initWmst && !isNaN(Number(initWmst))) {
        setInitUsdc(getV3Amounts(initWmst, tokenA_Symbol));
      } else if (lastEdited === "B" && initUsdc && !isNaN(Number(initUsdc))) {
        setInitWmst(getV3Amounts(initUsdc, tokenB_Symbol));
      }
    }
  }, [creationMode, isPoolInitialized, poolSqrtPriceX96, initTickLower, initTickUpper, usdcToken.decimals, wmstToken.decimals, tokenA_Symbol, tokenB_Symbol, initWmst, initUsdc, lastEdited]);

  const checkPoolStatus = async (fee: number) => {
    if (!publicClient || !tokenA_Symbol || !tokenB_Symbol) return;
    try {
      const t0 = wmstToken.address as Address;
      const t1 = usdcToken.address as Address;
      if (!t0 || !t1) return;

      const cacheKey = `${t0.toLowerCase()}-${t1.toLowerCase()}-${fee}`;
      let poolAddress = poolAddressCache.get(cacheKey) as Address | undefined;
      if (!poolAddress) {
        poolAddress = await publicClient.readContract({
          address: CONTRACTS.factory,
          abi: rapidexV3FactoryAbi,
          functionName: "getPool",
          args: [t0, t1, fee]
        }) as Address;
        if (poolAddress) poolAddressCache.set(cacheKey, poolAddress);
      }

      if (poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000") {
        const slot0 = await publicClient.readContract({
          address: poolAddress,
          abi: poolAbi,
          functionName: "slot0"
        }) as any;

        const sqrtPriceX96 = slot0[0] as bigint;
        if (sqrtPriceX96 > 0n) {
          setIsPoolInitialized(true);
          setPoolSqrtPriceX96(sqrtPriceX96);
          setCreationMode("existing");
          const isWmstToken0 = t0.toLowerCase() === wmstToken.address?.toLowerCase();
          const rawPrice = Number(sqrtPriceX96) / (2 ** 96);
          const ratioSquared = rawPrice * rawPrice;
          const priceOfWmstInUsdcRaw = isWmstToken0 ? ratioSquared : (ratioSquared > 0 ? 1 / ratioSquared : 0);
          const priceOfWmstInUsdc = priceOfWmstInUsdcRaw * Math.pow(10, wmstToken.decimals - usdcToken.decimals);
          setPoolCurrentPrice(priceOfWmstInUsdc);
          return;
        }
      }
      setIsPoolInitialized(false);
      setPoolCurrentPrice(null);
      setPoolSqrtPriceX96(null);
      setCreationMode("new");
    } catch (err) {
      console.error("Error checking pool status", err);
      setIsPoolInitialized(false);
      setPoolCurrentPrice(null);
      setPoolSqrtPriceX96(null);
      setCreationMode("new");
    }
  };

  const handleInitWmstChange = (val: string) => {
    setInitWmst(val);
    setLastEdited("A");
    if (creationMode === "existing") {
      if (!val.trim()) {
        setInitUsdc("");
        return;
      }
      const valNum = Number(val);
      if (!isNaN(valNum) && isPoolInitialized) {
        setInitUsdc(getV3Amounts(val, tokenA_Symbol));
      }
    }
  };

  const handleInitUsdcChange = (val: string) => {
    setInitUsdc(val);
    setLastEdited("B");
    if (creationMode === "existing") {
      if (!val.trim()) {
        setInitWmst("");
        return;
      }
      const valNum = Number(val);
      if (!isNaN(valNum) && isPoolInitialized) {
        setInitWmst(getV3Amounts(val, tokenB_Symbol));
      }
    }
  };

  // Auto-set ticks based on selected fee tier to prevent spacing reverts
  const handleFeeTierChange = (fee: number) => {
    setInitFee(fee);
    setRangeStrategy("stable");
    setRangeMode("custom");
    checkPoolStatus(fee);
  };

  useEffect(() => {
    let active = true;
    if (!publicClient) return;

    async function fetchMstPrice() {
      try {
        const wmstAddress = CONTRACTS.wmst;
        const usdcAddress = CONTRACTS.usdc;
        if (!wmstAddress || !usdcAddress || !publicClient) return;

        const oneUnitRaw = parseUnits("1", 18);
        const { result } = await publicClient.simulateContract({
          address: CONTRACTS.quoterV2,
          abi: quoterV2Abi,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn: wmstAddress,
              tokenOut: usdcAddress,
              amountIn: oneUnitRaw,
              fee: V3_FEE,
              sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
            }
          ]
        });

        if (active && result) {
          const outRaw = result[0];
          const price = Number(formatUnits(outRaw, 18));
          setLiveMstPrice(price);
        }
      } catch (err) {
        console.error("Error fetching MST price in LiquidityPage", err);
      }
    }

    fetchMstPrice();
    const interval = setInterval(fetchMstPrice, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [chainId, isConnected]);

  // Helper: Fetch user ERC20 token balances
  const fetchERC20Balances = async () => {
    if (!isConnected || !address || !publicClient) return;
    try {
      if (tokenA_Symbol) {
        if (tokenA_Symbol === "MST" || !wmstToken.address) {
          const bal = await publicClient.getBalance({ address });
          setWmstBalance(Number(formatUnits(bal, 18)).toFixed(4));
        } else {
          const bal = await publicClient.readContract({
            address: wmstToken.address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address]
          });
          setWmstBalance(Number(formatUnits(bal, wmstToken.decimals)).toFixed(4));
        }
      } else {
        setWmstBalance("0.00");
      }
      if (tokenB_Symbol) {
        if (tokenB_Symbol === "MST" || !usdcToken.address) {
          const bal = await publicClient.getBalance({ address });
          setUsdcBalance(Number(formatUnits(bal, 18)).toFixed(4));
        } else {
          const bal = await publicClient.readContract({
            address: usdcToken.address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address]
          });
          setUsdcBalance(Number(formatUnits(bal, usdcToken.decimals)).toFixed(4));
        }
      } else {
        setUsdcBalance("0.00");
      }
    } catch (e) {
      console.error("Error fetching ERC20 balances", e);
    }
  };

  // Helper: Fetch all on-chain LP positions details
  // Helper: Fetch all on-chain LP positions details from NPM directly
  const fetchLPState = async () => {
    if (!publicClient || !address || !isConnected) return;
    try {
      const balance = await publicClient.readContract({
        address: CONTRACTS.positionManager,
        abi: nonfungiblePositionManagerAbi,
        functionName: "balanceOf",
        args: [address]
      }) as bigint;

      if (balance === 0n) {
        setPositions([]);
        return;
      }

      const tokenIdsRaw = await Promise.all(
        Array.from({ length: Number(balance) }).map((_, i) =>
          publicClient.readContract({
            address: CONTRACTS.positionManager,
            abi: nonfungiblePositionManagerAbi,
            functionName: "tokenOfOwnerByIndex",
            args: [address, BigInt(i)]
          })
        )
      );

      const dbPositionsMock = tokenIdsRaw.map(id => ({ tokenId: id as bigint }));

      const tempPositionsRaw = await mapWithLimit(dbPositionsMock, 3, async (dbPos) => {
        try {
          const tokenId = dbPos.tokenId;
          const positionInfo = await publicClient.readContract({
            address: CONTRACTS.positionManager,
            abi: nonfungiblePositionManagerAbi,
            functionName: "positions",
            args: [tokenId]
          }) as any;

          const token0 = positionInfo[2] as Address;
          const token1 = positionInfo[3] as Address;
          const fee = Number(positionInfo[4]);
          const tickLower = Number(positionInfo[5]);
          const tickUpper = Number(positionInfo[6]);
          const liquidity = positionInfo[7] as bigint;
          let owed0 = positionInfo[10] as bigint;
          let owed1 = positionInfo[11] as bigint;

          try {
            const collectResult = await publicClient.readContract({
              address: CONTRACTS.positionManager,
              abi: [
                {
                  type: "function",
                  name: "collect",
                  stateMutability: "view",
                  inputs: [
                    {
                      name: "params",
                      type: "tuple",
                      components: [
                        { name: "tokenId", type: "uint256" },
                        { name: "recipient", type: "address" },
                        { name: "amount0Max", type: "uint128" },
                        { name: "amount1Max", type: "uint128" }
                      ]
                    }
                  ],
                  outputs: [
                    { name: "amount0", type: "uint256" },
                    { name: "amount1", type: "uint256" }
                  ]
                }
              ],
              functionName: "collect",
              args: [
                {
                  tokenId: tokenId,
                  recipient: address,
                  amount0Max: 340282366920938463463374607431768211455n, // type(uint128).max
                  amount1Max: 340282366920938463463374607431768211455n  // type(uint128).max
                }
              ],
              account: address
            }) as any;

            if (collectResult) {
              owed0 = collectResult[0];
              owed1 = collectResult[1];
            }
          } catch (simErr) {
            console.warn(`[Fee Estimation] Failed reading collect to fetch real-time fees for Token ID #${tokenId}:`, simErr);
          }

          const t0Info = TOKENS.find((t) => t.address?.toLowerCase() === token0.toLowerCase()) || await getOnchainTokenInfo(publicClient, token0);
          const t1Info = TOKENS.find((t) => t.address?.toLowerCase() === token1.toLowerCase()) || await getOnchainTokenInfo(publicClient, token1);

          const poolAddr = await publicClient.readContract({
            address: CONTRACTS.factory,
            abi: rapidexV3FactoryAbi,
            functionName: "getPool",
            args: [token0, token1, fee]
          }) as Address;
          let isInRange = false;
          let poolSqrtPriceX96 = 0n;
          let amount0 = 0n;
          let amount1 = 0n;

          if (poolAddr && poolAddr !== "0x0000000000000000000000000000000000000000") {
            try {
              const slot0 = await publicClient.readContract({
                address: poolAddr as Address,
                abi: poolAbi,
                functionName: "slot0"
              }) as any;
              const sqrtPriceX96 = slot0[0] as bigint;
              const activeTick = slot0[1] as number;

              poolSqrtPriceX96 = sqrtPriceX96;
              isInRange = activeTick >= tickLower && activeTick <= tickUpper;

              if (liquidity > 0n) {
                const [calcAmt0, calcAmt1] = getAmountsForLiquidity(
                  liquidity,
                  sqrtPriceX96,
                  tickLower,
                  tickUpper
                );
                amount0 = calcAmt0;
                amount1 = calcAmt1;
              }
            } catch (mathErr) {
              console.error("Failed calculating reserves from pool slot0 in LiquidityPage", mathErr);
            }
          }

          return {
            tokenId,
            liquidity,
            token0,
            token1,
            fee,
            tickLower,
            tickUpper,
            tokensOwed0: owed0,
            tokensOwed1: owed1,
            poolAddress: poolAddr,
            amount0,
            amount1,
            isInRange,
            token0Info: t0Info as TokenConfig,
            token1Info: t1Info as TokenConfig,
            poolSqrtPriceX96
          };
        } catch (err) {
          console.error(`Error querying details for tokenId ${dbPos.tokenId}`, err);
          return null;
        }
      });

      const tempPositions = tempPositionsRaw.filter((p): p is PositionItem => p !== null);
      setPositions(tempPositions);
    } catch (e) {
      console.error("Error fetching LP states in LiquidityPage", e);
    }
  };

  // Fetch all live values on load and periodically
  useEffect(() => {
    fetchERC20Balances();
    fetchLPState();
    if (currentView === "create") {
      checkPoolStatus(initFee);
    }

    const interval = setInterval(() => {
      fetchERC20Balances();
      fetchLPState();
      if (currentView === "create") {
        checkPoolStatus(initFee);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [address, isConnected, chainId, initFee, currentView, tokenA_Symbol, tokenB_Symbol, wmstToken.address, usdcToken.address]);

  // Sync pool existence status
  useEffect(() => {
    if (currentView === "create") {
      checkPoolStatus(initFee);
    }
  }, [initFee, currentView, chainId, tokenA_Symbol, tokenB_Symbol, wmstToken.address, usdcToken.address]);

  // Helper: Request token spending approvals
  async function approveTokenIfNeeded(tokenAddress: Address, amountRaw: bigint, symbol: string) {
    if (!publicClient || !address) return;

    setStatusText(`Checking ${symbol} allowance for Position Manager...`);
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, CONTRACTS.positionManager]
    });

    if (allowance >= amountRaw) return;

    setStatusText(`Approving Position Manager to use your ${symbol}...`);
    const approveTx = await writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.positionManager, amountRaw]
    });

    setStatusText(`Confirming ${symbol} approval on-chain...`);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }

  async function ensureMstChain() {
    if (chainId === mstChain.id) return true;

    setStatusText("Switch MetaMask to MST Testnet...");
    try {
      await switchChainAsync({ chainId: mstChain.id });
      return true;
    } catch {
      setStatusText("Transaction blocked until MetaMask is on MST Testnet.");
      return false;
    }
  }

  // Handle position accordion expansion and clear temporary form inputs
  const handleToggleExpand = (tokenId: bigint) => {
    if (expandedTokenId === tokenId) {
      setExpandedTokenId(null);
      setTokenA_Symbol("");
      setTokenB_Symbol("");
    } else {
      setExpandedTokenId(tokenId);
      setAddAmount0("");
      setAddAmount1("");
      setRemovePercent(50);

      const targetPos = positions?.find(p => p.tokenId === tokenId);
      if (targetPos) {
        setTokenA_Symbol(targetPos.token0Info.symbol);
        setTokenB_Symbol(targetPos.token1Info.symbol);
      }
    }
  };

  // Check and setup steps for pool creation
  const checkCreateSteps = async () => {
    const wmstVal = Number(initWmst) || 0;
    const usdcVal = Number(initUsdc) || 0;

    const isValidAmount = creationMode === "new"
      ? (wmstVal > 0 && usdcVal > 0)
      : (wmstVal > 0 || usdcVal > 0);

    if (!isConnected || !address || !publicClient || !isValidAmount) {
      setCreateSteps([]);
      return;
    }

    setLoadingCreateSteps(true);
    const wmstRaw = parseUnits(initWmst || "0", wmstToken.decimals);
    const usdcRaw = parseUnits(initUsdc || "0", usdcToken.decimals);
    const steps: any[] = [];

    try {
      const wmstAllowance = await publicClient.readContract({
        address: wmstToken.address as Address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, CONTRACTS.positionManager]
      });
      if (wmstRaw > 0n && wmstAllowance < wmstRaw) {
        steps.push({
          id: "approveWMST",
          label: `Approve ${tokenA_Symbol}`,
          description: `Allow NonfungiblePositionManager to spend your ${tokenA_Symbol}`,
          tokenAddress: wmstToken.address,
          amountRaw: wmstRaw,
          symbol: tokenA_Symbol,
          status: "idle"
        });
      }
    } catch (e) {
      console.error("Error reading WMST allowance:", e);
    }

    try {
      const usdcAllowance = await publicClient.readContract({
        address: usdcToken.address as Address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, CONTRACTS.positionManager]
      });
      if (usdcRaw > 0n && usdcAllowance < usdcRaw) {
        steps.push({
          id: "approveUSDC",
          label: `Approve ${tokenB_Symbol}`,
          description: `Allow NonfungiblePositionManager to spend your ${tokenB_Symbol}`,
          tokenAddress: usdcToken.address,
          amountRaw: usdcRaw,
          symbol: tokenB_Symbol,
          status: "idle"
        });
      }
    } catch (e) {
      console.error("Error reading USDC allowance:", e);
    }

    steps.push({
      id: "initialize",
      label: "Create Pool & Mint Liquidity",
      description: "Initialize the pool and mint your position",
      status: "idle"
    });

    setCreateSteps(steps);
    setActiveCreateStepIndex(0);
    setLoadingCreateSteps(false);
  };

  const executeCreateStep = async (index: number) => {
    const step = createSteps[index];
    if (!step) return;

    if (!(await ensureMstChain())) {
      return;
    }

    // Set step to working
    setCreateSteps(prev => prev.map((s, i) => i === index ? { ...s, status: "working" } : s));
    setIsWorking(true);
    setTxHash("");
    setStatusText(step.label + "...");

    try {
      if (step.id === "approveWMST" || step.id === "approveUSDC") {
        const hash = await writeContractAsync({
          address: step.tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.positionManager, step.amountRaw]
        });
        setTxHash(hash);
        setStatusText(`Waiting for ${step.symbol} approval on-chain...`);
        await publicClient?.waitForTransactionReceipt({ hash });

        // Mark as completed
        setCreateSteps(prev => prev.map((s, i) => i === index ? { ...s, status: "completed" } : s));
        setActiveCreateStepIndex(index + 1);
        setStatusText(`${step.symbol} Approved!`);
        fetchERC20Balances();
      } else if (step.id === "initialize") {
        const wmstRaw = parseUnits(initWmst || "0", wmstToken.decimals);
        const usdcRaw = parseUnits(initUsdc || "0", usdcToken.decimals);

        // Sort tokens numerically as Rapidex V3 requires token0 < token1
        let t0 = wmstToken.address as Address;
        let t1 = usdcToken.address as Address;
        let amount0 = wmstRaw;
        let amount1 = usdcRaw;
        let tickLowerAligned = alignTick(initTickLower, initFee);
        let tickUpperAligned = alignTick(initTickUpper, initFee);

        if (t0.toLowerCase() > t1.toLowerCase()) {
          t0 = usdcToken.address as Address;
          t1 = wmstToken.address as Address;
          amount0 = usdcRaw;
          amount1 = wmstRaw;

          const temp = tickLowerAligned;
          tickLowerAligned = -tickUpperAligned;
          tickUpperAligned = -temp;
        }

        const dec0 = t0.toLowerCase() === wmstToken.address?.toLowerCase() ? wmstToken.decimals : usdcToken.decimals;
        const dec1 = t1.toLowerCase() === wmstToken.address?.toLowerCase() ? wmstToken.decimals : usdcToken.decimals;

        const amount0Float = t0.toLowerCase() === wmstToken.address?.toLowerCase() ? Number(initWmst) : Number(initUsdc);
        const amount1Float = t1.toLowerCase() === wmstToken.address?.toLowerCase() ? Number(initWmst) : Number(initUsdc);

        const basePriceRatio = amount1Float / amount0Float;
        const decimalAdjustment = 10 ** (dec1 - dec0);
        const priceRatio = basePriceRatio * decimalAdjustment;
        const sqrtPrice = Math.sqrt(priceRatio);
        const Q96 = 2n ** 96n;
        const dynamicSqrtPriceX96 = BigInt(Math.floor(sqrtPrice * 1000000000000)) * Q96 / 1000000000000n;

        // Check if pool is already initialized on factory
        let poolAddr = await publicClient?.readContract({
          address: CONTRACTS.factory,
          abi: rapidexV3FactoryAbi,
          functionName: "getPool",
          args: [t0, t1, initFee]
        }) as Address;

        let isInitializedOnChain = false;
        if (poolAddr && poolAddr !== "0x0000000000000000000000000000000000000000") {
          try {
            const slot0 = await publicClient?.readContract({
              address: poolAddr,
              abi: poolAbi,
              functionName: "slot0"
            }) as any;
            if (slot0 && slot0[0] > 0n) {
              isInitializedOnChain = true;
            }
          } catch (e) {
            console.log("Pool not initialized yet");
          }
        }

        if (!isInitializedOnChain) {
          setStatusText("Initializing Pool on-chain...");
          const initPoolHash = await writeContractAsync({
            address: CONTRACTS.positionManager,
            abi: nonfungiblePositionManagerAbi,
            functionName: "createAndInitializePoolIfNecessary",
            args: [t0, t1, initFee, dynamicSqrtPriceX96]
          });
          setStatusText("Waiting for pool initialization transaction...");
          const initReceipt = await publicClient?.waitForTransactionReceipt({ hash: initPoolHash });

          if (!initReceipt || initReceipt.status !== "success") {
            throw new Error("Pool initialization transaction reverted on-chain.");
          }
        }

        setStatusText("Minting position via NonfungiblePositionManager...");
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 mins

        const mintHash = await writeContractAsync({
          address: CONTRACTS.positionManager,
          abi: nonfungiblePositionManagerAbi,
          functionName: "mint",
          args: [
            {
              token0: t0,
              token1: t1,
              fee: initFee,
              tickLower: tickLowerAligned,
              tickUpper: tickUpperAligned,
              amount0Desired: amount0,
              amount1Desired: amount1,
              amount0Min: amount0 * 995n / 1000n,
              amount1Min: amount1 * 995n / 1000n,
              recipient: address as Address,
              deadline: deadline
            }
          ]
        });

        setTxHash(mintHash);
        setStatusText("Waiting for position mint confirmation...");
        const receipt = await publicClient?.waitForTransactionReceipt({ hash: mintHash });

        if (!receipt || receipt.status !== "success") {
          throw new Error("Mint transaction reverted on-chain. No liquidity was added.");
        }

        let tokenIdStr = "";
        if (receipt && receipt.logs) {
          for (const log of receipt.logs) {
            try {
              if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                const decoded = decodeEventLog({
                  abi: [
                    {
                      type: "event",
                      name: "Transfer",
                      inputs: [
                        { indexed: true, name: "from", type: "address" },
                        { indexed: true, name: "to", type: "address" },
                        { indexed: true, name: "tokenId", type: "uint256" }
                      ]
                    }
                  ],
                  data: log.data,
                  topics: log.topics
                });
                if (decoded.eventName === "Transfer" && decoded.args.tokenId !== undefined) {
                  tokenIdStr = decoded.args.tokenId.toString();
                  break;
                }
              }
            } catch (e) {
              // Ignore decoding errors
            }
          }
        }

        // Always try to register the pool in the backend database (and log initial/added liquidity)
        try {
          let actualPoolAddr = poolAddr;
          if (!actualPoolAddr || actualPoolAddr === "0x0000000000000000000000000000000000000000") {
            actualPoolAddr = await publicClient?.readContract({
              address: CONTRACTS.factory,
              abi: rapidexV3FactoryAbi,
              functionName: "getPool",
              args: [t0, t1, initFee]
            }) as Address;
          }

          if (actualPoolAddr && actualPoolAddr !== "0x0000000000000000000000000000000000000000") {
            const t0Lower = t0.toLowerCase();
            const t1Lower = t1.toLowerCase();
            const isT0Wmst = t0Lower === wmstToken.address?.toLowerCase();

            // 1. Create pool in backend if it doesn't exist yet
            try {
              await poolService.createPool({
                poolAddress: actualPoolAddr.toLowerCase(),
                token0Address: t0Lower,
                token1Address: t1Lower,
                token0Symbol: isT0Wmst ? (tokenA_Symbol || "WMST") : (tokenB_Symbol || "USDC"),
                token1Symbol: isT0Wmst ? (tokenB_Symbol || "USDC") : (tokenA_Symbol || "WMST"),
                creatorWallet: address?.toLowerCase() || "",
                txHash: mintHash.toLowerCase(),
                chainId: chainId || mstChain.id,
                feeTier: initFee,
                token0Decimals: isT0Wmst ? wmstToken.decimals : usdcToken.decimals,
                token1Decimals: isT0Wmst ? usdcToken.decimals : wmstToken.decimals,
                token0InitialAmount: amount0.toString(),
                token1InitialAmount: amount1.toString()
              });
              console.log("Registered pool in backend successfully:", actualPoolAddr);
            } catch (poolErr) {
              console.log("Pool already exists in backend or skipped:", poolErr);
            }

            // 2. Log this liquidity addition transaction
            try {
              await liquidityService.recordAddLiquidity({
                poolAddress: actualPoolAddr.toLowerCase(),
                walletAddress: address?.toLowerCase() || "",
                token0Amount: amount0.toString(),
                token1Amount: amount1.toString(),
                txHash: mintHash.toLowerCase(),
                chainId: chainId || mstChain.id
              });
              console.log("Logged initial add-liquidity in backend successfully");
            } catch (liqErr) {
              console.error("Failed to log initial add-liquidity in backend:", liqErr);
            }

            // 3. Register position NFT in database
            if (tokenIdStr) {
              try {
                const positionInfo = await publicClient?.readContract({
                  address: CONTRACTS.positionManager,
                  abi: nonfungiblePositionManagerAbi,
                  functionName: "positions",
                  args: [BigInt(tokenIdStr)]
                }) as any;

                const onChainLiquidity = positionInfo ? (positionInfo[7] as bigint) : 0n;
                let finalAmount0 = amount0;
                let finalAmount1 = amount1;

                if (actualPoolAddr && actualPoolAddr !== "0x0000000000000000000000000000000000000000") {
                  try {
                    const slot0 = await publicClient?.readContract({
                      address: actualPoolAddr,
                      abi: poolAbi,
                      functionName: "slot0"
                    }) as any;
                    const sqrtPriceX96 = slot0[0] as bigint;
                    const [calcAmt0, calcAmt1] = getAmountsForLiquidity(
                      onChainLiquidity,
                      sqrtPriceX96,
                      tickLowerAligned,
                      tickUpperAligned
                    );
                    finalAmount0 = calcAmt0;
                    finalAmount1 = calcAmt1;
                  } catch (mathErr) {
                    console.error("Failed calculating reserves from pool slot0 during creation sync", mathErr);
                  }
                }

                await lpPositionService.syncPosition({
                  tokenId: tokenIdStr,
                  poolAddress: actualPoolAddr.toLowerCase(),
                  walletAddress: address?.toLowerCase() || "",
                  tickLower: tickLowerAligned,
                  tickUpper: tickUpperAligned,
                  liquidity: onChainLiquidity.toString(),
                  token0Amount: finalAmount0.toString(),
                  token1Amount: finalAmount1.toString()
                });
                console.log("Registered LP Position NFT in backend successfully:", tokenIdStr);
              } catch (posErr) {
                console.error("Failed to register LP Position NFT in backend:", posErr);
              }
            }
          }
        } catch (err) {
          console.error("Failed to sync new position/pool with backend:", err);
        }

        // Mark as completed
        setCreateSteps(prev => prev.map((s, i) => i === index ? { ...s, status: "completed" } : s));
        setStatusText("Pool initialized and liquidity minted successfully!");

        setInitWmst("");
        setInitUsdc("");
        fetchLPState();
        fetchERC20Balances();
        queryClient.invalidateQueries();
        usePortfolioStore.getState().refreshPortfolio();

        // Auto close and go back to list
        setTimeout(() => {
          setPendingAction(null);
          setCurrentView("list");
          setStatusText("");
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Step failed.";
      setStatusText(msg.substring(0, 80));
      setCreateSteps(prev => prev.map((s, i) => i === index ? { ...s, status: "failed", error: msg.substring(0, 80) } : s));
    } finally {
      setIsWorking(false);
    }
  };

  // Action 2: Add Active Liquidity to Expanded Position
  const handleAddLiquidity = async () => {
    const expandedPosition = positions?.find(p => p.tokenId === expandedTokenId);
    if (!isConnected || !expandedPosition) return;

    if (!(await ensureMstChain())) {
      return;
    }

    if (!addAmount0 || !addAmount1) {
      setStatusText("Provide amounts to add liquidity.");
      return;
    }

    setIsWorking(true);
    setTxHash("");
    setStatusText("Preparing Liquidity Addition...");

    try {
      const amount0Desired = parseUnits(addAmount0, expandedPosition.token0Info.decimals);
      const amount1Desired = parseUnits(addAmount1, expandedPosition.token1Info.decimals);

      // Step A: Approve tokens for Position Manager
      if (amount0Desired > 0n) {
        await approveTokenIfNeeded(
          expandedPosition.token0,
          amount0Desired,
          expandedPosition.token0Info.symbol
        );
      }
      if (amount1Desired > 0n) {
        await approveTokenIfNeeded(
          expandedPosition.token1,
          amount1Desired,
          expandedPosition.token1Info.symbol
        );
      }

      // Step B: Call increaseLiquidity on NonfungiblePositionManager
      setStatusText("Confirming liquidity addition in wallet...");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 mins deadline

      const hash = await writeContractAsync({
        address: CONTRACTS.positionManager,
        abi: nonfungiblePositionManagerAbi,
        functionName: "increaseLiquidity",
        args: [
          {
            tokenId: expandedPosition.tokenId,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: amount0Desired * 995n / 1000n,
            amount1Min: amount1Desired * 995n / 1000n,
            deadline: deadline
          }
        ]
      });

      setTxHash(hash);
      setStatusText("Waiting for block confirmation on MST Blockchain...");
      const increaseReceipt = await publicClient?.waitForTransactionReceipt({ hash });

      if (!increaseReceipt || increaseReceipt.status !== "success") {
        throw new Error("Increase liquidity transaction reverted on-chain. No liquidity was added.");
      }

      // Log the liquidity addition in the backend database
      try {
        await liquidityService.recordAddLiquidity({
          poolAddress: expandedPosition.poolAddress.toLowerCase(),
          walletAddress: address?.toLowerCase() || "",
          token0Amount: amount0Desired.toString(),
          token1Amount: amount1Desired.toString(),
          txHash: hash.toLowerCase(),
          chainId: chainId || mstChain.id
        });
        console.log("Logged increase-liquidity in backend successfully");
      } catch (liqErr) {
        console.error("Failed to log increase-liquidity in backend:", liqErr);
      }

      // Sync position in database
      try {
        const positionInfo = await publicClient?.readContract({
          address: CONTRACTS.positionManager,
          abi: nonfungiblePositionManagerAbi,
          functionName: "positions",
          args: [expandedPosition.tokenId]
        }) as any;

        const onChainLiquidity = positionInfo ? (positionInfo[7] as bigint) : 0n;
        let finalAmount0 = amount0Desired;
        let finalAmount1 = amount1Desired;

        if (expandedPosition.poolAddress && expandedPosition.poolAddress !== "0x0000000000000000000000000000000000000000") {
          try {
            const slot0 = await publicClient?.readContract({
              address: expandedPosition.poolAddress as Address,
              abi: poolAbi,
              functionName: "slot0"
            }) as any;
            const sqrtPriceX96 = slot0[0] as bigint;
            const [calcAmt0, calcAmt1] = getAmountsForLiquidity(
              onChainLiquidity,
              sqrtPriceX96,
              expandedPosition.tickLower,
              expandedPosition.tickUpper
            );
            finalAmount0 = calcAmt0;
            finalAmount1 = calcAmt1;
          } catch (mathErr) {
            console.error("Failed calculating reserves from pool slot0 during add sync", mathErr);
          }
        }

        await lpPositionService.syncPosition({
          tokenId: expandedPosition.tokenId.toString(),
          poolAddress: expandedPosition.poolAddress.toLowerCase(),
          walletAddress: address?.toLowerCase() || "",
          tickLower: expandedPosition.tickLower,
          tickUpper: expandedPosition.tickUpper,
          liquidity: onChainLiquidity.toString(),
          token0Amount: finalAmount0.toString(),
          token1Amount: finalAmount1.toString()
        });
        console.log("Synced LP Position NFT in backend after increaseLiquidity");
      } catch (posErr) {
        console.error("Failed to sync LP Position NFT in backend after increaseLiquidity:", posErr);
      }

      setStatusText("Concentrated liquidity successfully added!");
      setAddAmount0("");
      setAddAmount1("");
      fetchLPState();
      fetchERC20Balances();
      queryClient.invalidateQueries();
      usePortfolioStore.getState().refreshPortfolio();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to add liquidity.";
      setStatusText(msg.substring(0, 80));
    } finally {
      setIsWorking(false);
    }
  };

  // Action 3: Remove Active Liquidity from Expanded Position
  const handleRemoveLiquidity = async () => {
    const expandedPosition = positions?.find(p => p.tokenId === expandedTokenId);
    if (!isConnected || !address || !expandedPosition || !expandedPosition.liquidity) return;

    if (!(await ensureMstChain())) {
      return;
    }

    setIsWorking(true);
    setTxHash("");
    setStatusText("Preparing Liquidity Removal...");

    try {
      const liqToRemove = (expandedPosition.liquidity * BigInt(removePercent)) / 100n;
      const expectedAmount0 = (expandedPosition.amount0 * BigInt(removePercent)) / 100n;
      const expectedAmount1 = (expandedPosition.amount1 * BigInt(removePercent)) / 100n;
      setStatusText(`Confirming removal of ${removePercent}% liquidity...`);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 mins

      const decreaseHash = await writeContractAsync({
        address: CONTRACTS.positionManager,
        abi: nonfungiblePositionManagerAbi,
        functionName: "decreaseLiquidity",
        args: [
          {
            tokenId: expandedPosition.tokenId,
            liquidity: liqToRemove,
            amount0Min: (expectedAmount0 * 995n) / 1000n,
            amount1Min: (expectedAmount1 * 995n) / 1000n,
            deadline: deadline
          }
        ]
      });

      setTxHash(decreaseHash);
      setStatusText("Waiting for decrease liquidity transaction receipt...");
      const decreaseReceipt = await publicClient?.waitForTransactionReceipt({ hash: decreaseHash });

      if (!decreaseReceipt || decreaseReceipt.status !== "success") {
        throw new Error("Decrease liquidity transaction reverted on-chain. No liquidity was removed.");
      }

      // Log the liquidity removal in the backend database
      try {
        await liquidityService.recordRemoveLiquidity({
          poolAddress: expandedPosition.poolAddress.toLowerCase(),
          walletAddress: address?.toLowerCase() || "",
          token0Amount: expectedAmount0.toString(),
          token1Amount: expectedAmount1.toString(),
          txHash: decreaseHash.toLowerCase(),
          chainId: chainId || mstChain.id
        });
        console.log("Logged remove-liquidity in backend successfully");
      } catch (liqErr) {
        console.error("Failed to log remove-liquidity in backend:", liqErr);
      }

      // Now collect the tokens from decrease liquidity
      setStatusText("Collecting tokens from position...");
      const collectHash = await writeContractAsync({
        address: CONTRACTS.positionManager,
        abi: nonfungiblePositionManagerAbi,
        functionName: "collect",
        args: [
          {
            tokenId: expandedPosition.tokenId,
            recipient: address,
            amount0Max: 340282366920938463463374607431768211455n, // type(uint128).max
            amount1Max: 340282366920938463463374607431768211455n  // type(uint128).max
          }
        ]
      });

      setTxHash(collectHash);
      setStatusText("Waiting for token collection receipt...");
      const collectReceipt = await publicClient?.waitForTransactionReceipt({ hash: collectHash });

      if (!collectReceipt || collectReceipt.status !== "success") {
        throw new Error("Collect transaction reverted on-chain after removing liquidity.");
      }

      // Sync position in database after removal
      try {
        const positionInfo = await publicClient?.readContract({
          address: CONTRACTS.positionManager,
          abi: nonfungiblePositionManagerAbi,
          functionName: "positions",
          args: [expandedPosition.tokenId]
        }) as any;

        const onChainLiquidity = positionInfo ? (positionInfo[7] as bigint) : 0n;
        let finalAmount0 = 0n;
        let finalAmount1 = 0n;

        if (expandedPosition.poolAddress && expandedPosition.poolAddress !== "0x0000000000000000000000000000000000000000") {
          try {
            const slot0 = await publicClient?.readContract({
              address: expandedPosition.poolAddress as Address,
              abi: poolAbi,
              functionName: "slot0"
            }) as any;
            const sqrtPriceX96 = slot0[0] as bigint;
            if (onChainLiquidity > 0n) {
              const [calcAmt0, calcAmt1] = getAmountsForLiquidity(
                onChainLiquidity,
                sqrtPriceX96,
                expandedPosition.tickLower,
                expandedPosition.tickUpper
              );
              finalAmount0 = calcAmt0;
              finalAmount1 = calcAmt1;
            }
          } catch (mathErr) {
            console.error("Failed calculating reserves from pool slot0 during remove sync", mathErr);
          }
        }

        await lpPositionService.syncPosition({
          tokenId: expandedPosition.tokenId.toString(),
          poolAddress: expandedPosition.poolAddress.toLowerCase(),
          walletAddress: address?.toLowerCase() || "",
          tickLower: expandedPosition.tickLower,
          tickUpper: expandedPosition.tickUpper,
          liquidity: onChainLiquidity.toString(),
          token0Amount: finalAmount0.toString(),
          token1Amount: finalAmount1.toString()
        });
        console.log("Synced LP Position NFT in backend after decreaseLiquidity");
      } catch (posErr) {
        console.error("Failed to sync LP Position NFT in backend after decreaseLiquidity:", posErr);
      }

      setStatusText("Liquidity successfully removed and tokens collected!");
      fetchLPState();
      fetchERC20Balances();
      queryClient.invalidateQueries();
      usePortfolioStore.getState().refreshPortfolio();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to remove liquidity.";
      setStatusText(msg.substring(0, 80));
    } finally {
      setIsWorking(false);
    }
  };

  // Action 4: Collect Active LP Fees
  const handleCollectFees = async () => {
    const expandedPosition = positions?.find(p => p.tokenId === expandedTokenId);
    if (!isConnected || !address || !expandedPosition) return;

    if (!(await ensureMstChain())) {
      return;
    }

    setIsWorking(true);
    setTxHash("");
    setStatusText("Requesting LP Fee Collection...");

    try {
      setStatusText("Confirming fee collection in wallet...");
      const hash = await writeContractAsync({
        address: CONTRACTS.positionManager,
        abi: nonfungiblePositionManagerAbi,
        functionName: "collect",
        args: [
          {
            tokenId: expandedPosition.tokenId,
            recipient: address,
            amount0Max: 340282366920938463463374607431768211455n, // type(uint128).max
            amount1Max: 340282366920938463463374607431768211455n  // type(uint128).max
          }
        ]
      });

      setTxHash(hash);
      setStatusText("Withdrawing fees from NonfungiblePositionManager...");
      const feeReceipt = await publicClient?.waitForTransactionReceipt({ hash });

      if (!feeReceipt || feeReceipt.status !== "success") {
        throw new Error("Fee collection transaction reverted on-chain.");
      }

      setStatusText("Accrued LP fees successfully collected!");
      fetchLPState();
      fetchERC20Balances();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Fee collection failed.";
      setStatusText(msg.substring(0, 80));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="relative min-h-screen px-4 pb-20 pt-[104px] overflow-hidden font-sans">
      <main className={`relative z-10 mx-auto space-y-8 transition-all duration-300 ${currentView === "create" ? "max-w-[1200px]" : "max-w-[1000px]"
        }`}>

        {/* VIEW 1: POSITIONS LIST DASHBOARD */}
        {currentView === "list" && (
          <div className="space-y-6">

            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-5xl md:text-6xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                    Liquidity Pools
                  </span>
                </h1>
                <p className={`text-sm md:text-base ${isDark ? "text-zinc-300" : "text-zinc-700"} font-medium leading-relaxed`}>
                  Manage your V3 concentrated liquidity positions, track fees, and analyze tick ranges.
                </p>
              </div>

              <div className="flex items-center gap-4">


                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentView("create")}
                  className={`flex items-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-md
                    ${isDark
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/15"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-blue-500/10"}`}
                >
                  <Plus size={16} />
                  New Position
                </motion.button>
              </div>
            </div>

            {/* Portfolio Metrics Summary (Only if positions exist) */}
            {positions && positions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-5"
              >
                <div
                  className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5
                    ${isDark
                      ? "bg-[#131A2A]/60 border-[#2C364F]/50 text-white shadow-black/25"
                      : "bg-white/90 border-zinc-200 text-zinc-950 shadow-zinc-200/50"
                    }`}
                >
                  <div className="absolute top-[-30px] right-[-30px] w-20 h-20 bg-gradient-to-br from-cyan-500/15 to-transparent rounded-full blur-xl pointer-events-none" />
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                    Total Deposited Value (TVL)
                  </p>
                  <p className="text-3xl font-black mt-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    ≈ {formatCurrency(portfolioStats.totalUSD)}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Valuation based on live MST/USDC rates</p>
                </div>

                <div
                  className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5
                    ${isDark
                      ? "bg-[#131A2A]/60 border-[#2C364F]/50 text-white shadow-black/25"
                      : "bg-white/90 border-zinc-200 text-zinc-950 shadow-zinc-200/50"
                    }`}
                >
                  <div className="absolute top-[-30px] right-[-30px] w-20 h-20 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-full blur-xl pointer-events-none" />
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                    Active Ranges
                  </p>
                  <p className="text-3xl font-black mt-2 text-emerald-400">
                    {portfolioStats.activeCount} <span className={`text-xl font-bold ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>/ {portfolioStats.positionsCount} active</span>
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Positions earning swap fees right now</p>
                </div>

                <div
                  className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5
                    ${isDark
                      ? "bg-[#131A2A]/60 border-[#2C364F]/50 text-white shadow-black/25"
                      : "bg-white/90 border-zinc-200 text-zinc-950 shadow-zinc-200/50"
                    }`}
                >
                  <div className="absolute top-[-30px] right-[-30px] w-20 h-20 bg-gradient-to-br from-purple-500/15 to-transparent rounded-full blur-xl pointer-events-none" />
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                    LP Positions Owned
                  </p>
                  <p className="text-3xl font-black mt-2 text-purple-400">
                    {portfolioStats.positionsCount} <span className={`text-base font-medium ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>NFTs</span>
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>ERC-721 liquidity tokens in wallet</p>
                </div>
              </motion.div>
            )}

            {/* Positions container */}
            <div className="space-y-4">

              {/* Sort & Filter Toolbar */}
              {positions && positions.length > 0 && (
                <div className={`p-4 rounded-[24px] border backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300
                  ${isDark ? "bg-[#0b0b14]/50 border-zinc-800/40" : "bg-white/60 border-zinc-200/80 shadow-sm"}`}>

                  {/* Fee Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider mr-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      Fee Tier:
                    </span>
                    {(["all", 500, 3000, 10000] as const).map((fee) => {
                      const isActive = feeFilter === fee;
                      const label = fee === "all" ? "All" : `${fee / 10000}%`;
                      return (
                        <button
                          key={fee}
                          onClick={() => setFeeFilter(fee)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200
                            ${isActive
                              ? isDark
                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/5"
                                : "bg-zinc-100 text-zinc-900 border border-zinc-200 shadow-sm"
                              : isDark
                                ? "text-zinc-400 hover:text-zinc-200 bg-white/5 border border-transparent"
                                : "text-zinc-600 hover:text-zinc-800 bg-zinc-50 border border-transparent"
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort Dropdown Selector */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      Sort by:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className={`text-xs font-bold rounded-xl px-3 py-1.5 border outline-none cursor-pointer transition-all duration-200
                        ${isDark
                          ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 focus:border-cyan-500/50"
                          : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 focus:border-cyan-500/50 shadow-sm"
                        }`}
                    >
                      <option value="tokenId-desc">Date Added (Newest)</option>
                      <option value="tokenId-asc">Date Added (Oldest)</option>
                      <option value="value-desc">Value (High to Low)</option>
                      <option value="value-asc">Value (Low to High)</option>
                      <option value="status">Status (In Range First)</option>
                    </select>
                  </div>

                </div>
              )}

              {positions === null ? (
                // Pulse loading skeleton list
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className={`p-6 rounded-[30px] border animate-pulse flex flex-col gap-4 transition-all duration-300 backdrop-blur-2xl
                        ${isDark
                          ? "bg-[#0b0b14]/75 border-zinc-800/60"
                          : "bg-white/80 border-zinc-200"
                        }`}
                      style={{
                        boxShadow: isDark
                          ? "inset 0 1px 1px rgba(255,255,255,0.06), 0 20px 40px rgba(0,0,0,0.8)"
                          : "inset 0 1px 1px rgba(255,255,255,0.8), 0 20px 40px rgba(0,0,0,0.05)"
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-700/30" />
                          <div className="w-24 h-6 bg-zinc-700/30 rounded" />
                        </div>
                        <div className="w-16 h-6 bg-zinc-700/30 rounded" />
                      </div>
                      <div className="h-4 bg-zinc-700/20 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : positions.length === 0 ? (
                // Elegant empty state
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-16 rounded-[30px] border text-center flex flex-col items-center justify-center gap-6 shadow-2xl relative backdrop-blur-2xl transition-all duration-300
                    ${isDark
                      ? "bg-[#0b0b14]/75 border-zinc-800/60 text-white"
                      : "bg-white/80 border-zinc-200 text-zinc-950"
                    }`}
                  style={{
                    boxShadow: isDark
                      ? "inset 0 1px 1px rgba(255,255,255,0.06), 0 20px 40px rgba(0,0,0,0.8)"
                      : "inset 0 1px 1px rgba(255,255,255,0.8), 0 20px 40px rgba(0,0,0,0.05)"
                  }}
                >
                  <div className={`p-5 rounded-2xl ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>
                    <Coins size={48} />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <h3 className="font-bold text-2xl">No positions found</h3>
                    <p className={`text-base ${isDark ? "text-zinc-400" : "text-zinc-505"} leading-relaxed`}>
                      Your Rapidex V3 concentrated liquidity NFTs will list here. Deploy liquidity to start earning fee rewards.
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentView("create")}
                    className={`py-3.5 px-6 rounded-xl font-bold text-base transition-all
                      ${isDark ? "bg-[#1e293b] hover:bg-[#334155] text-cyan-400 border border-cyan-500/20" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"}`}
                  >
                    Deploy First Position
                  </motion.button>
                </motion.div>
              ) : processedPositions && processedPositions.length === 0 ? (
                // Filtered empty state
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-12 rounded-[30px] border text-center flex flex-col items-center justify-center gap-4 shadow-xl backdrop-blur-2xl transition-all duration-300
                    ${isDark
                      ? "bg-[#0b0b14]/75 border-zinc-800/60 text-white"
                      : "bg-white/80 border-zinc-200 text-zinc-950"
                    }`}
                  style={{
                    boxShadow: isDark
                      ? "inset 0 1px 1px rgba(255,255,255,0.06), 0 20px 40px rgba(0,0,0,0.8)"
                      : "inset 0 1px 1px rgba(255,255,255,0.8), 0 20px 40px rgba(0,0,0,0.05)"
                  }}
                >
                  <div className={`p-4 rounded-xl ${isDark ? "bg-zinc-800/40 text-zinc-400" : "bg-zinc-100 text-zinc-500"}`}>
                    <Coins size={36} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg">No positions matching this fee tier</h4>
                    <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-505"}`}>
                      Clear the fee tier filter or try another option.
                    </p>
                  </div>
                  <button
                    onClick={() => setFeeFilter("all")}
                    className={`py-2 px-4 rounded-xl font-bold text-xs transition-all mt-2
                      ${isDark ? "bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/20" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"}`}
                  >
                    Clear Filter
                  </button>
                </motion.div>
              ) : (
                // Position List Cards
                <div className="space-y-4">
                  {processedPositions && processedPositions.map((pos) => {
                    const isExpanded = expandedTokenId === pos.tokenId;
                    const token0Symbol = pos.token0Info.symbol;
                    const token1Symbol = pos.token1Info.symbol;

                    const amt0Formatted = Number(formatUnits(pos.amount0, pos.token0Info.decimals));
                    const amt1Formatted = Number(formatUnits(pos.amount1, pos.token1Info.decimals));

                    const val0 = amt0Formatted * getTokenPrice(token0Symbol);
                    const val1 = amt1Formatted * getTokenPrice(token1Symbol);
                    const totalUSD = val0 + val1;

                    const feeFormatted = (pos.fee / 10000).toFixed(2);

                    return (
                      <div
                        key={pos.tokenId.toString()}
                        className={`rounded-[30px] border relative backdrop-blur-2xl transition-all duration-300 overflow-hidden shadow-2xl
                          ${isExpanded
                            ? isDark ? "bg-[#0b0b14]/90 border-cyan-500/50 shadow-cyan-500/10" : "bg-white/95 border-cyan-500/40"
                            : isDark ? "bg-[#0b0b14]/75 border-zinc-800/60 hover:border-zinc-700/80" : "bg-white/80 border-zinc-200 hover:border-zinc-300"
                          }`}
                        style={{
                          boxShadow: isDark
                            ? "inset 0 1px 1px rgba(255,255,255,0.06), 0 20px 40px rgba(0,0,0,0.8)"
                            : "inset 0 1px 1px rgba(255,255,255,0.8), 0 20px 40px rgba(0,0,0,0.05)"
                        }}
                      >
                        {/* Header details block (Always visible, triggers expand/collapse on click) */}
                        <div
                          onClick={() => handleToggleExpand(pos.tokenId)}
                          className="p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-4">
                            {/* Overlayed double token logo */}
                            <div className="flex items-center shrink-0">
                              <TokenLogo symbol={token0Symbol} size={32} />
                              <div className="ml-[-12px] relative z-10 border-2 border-[#131A2A] rounded-full">
                                <TokenLogo symbol={token1Symbol} size={32} />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black">{token0Symbol} / {token1Symbol}</h3>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg
                                  ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"}`}>
                                  {feeFormatted}%
                                </span>
                              </div>
                              <p className={`text-sm font-mono mt-1 ${isDark ? "text-zinc-505" : "text-zinc-400"}`}>
                                ID: #{pos.tokenId.toString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-6">
                            {/* Reserve Value indicator */}
                            <div className="text-left md:text-right">
                              <p className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "text-zinc-505" : "text-zinc-400"}`}>
                                Reserves Value
                              </p>
                              <p className="text-lg font-black mt-0.5">
                                ≈ {formatCurrency(totalUSD)}
                              </p>
                            </div>

                            {/* Range badge */}
                            <div className="flex items-center gap-3">
                              {pos.isInRange ? (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                  In Range
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  Out of Range
                                </span>
                              )}

                              {isExpanded ? (
                                <ChevronUp className={isDark ? "text-zinc-400" : "text-zinc-600"} size={22} />
                              ) : (
                                <ChevronDown className={isDark ? "text-zinc-400" : "text-zinc-600"} size={22} />
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Collapsible content (Accordion Details) */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden border-t border-[#2C364F]/30"
                            >
                              <div className="p-6 md:p-8 space-y-8 bg-zinc-950/20">

                                {/* 1. Detailed underlying reserves */}
                                <div className="space-y-3">
                                  <h4 className={`text-sm uppercase tracking-wider font-bold ${isDark ? "text-zinc-400" : "text-zinc-505"}`}>
                                    Underlying Liquidity Reserves
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Token 0 */}
                                    <div className={`p-5 rounded-xl border flex justify-between items-center backdrop-blur-sm
                                      ${isDark ? "bg-[#1B2236]/40 border-[#2C364F]/25" : "bg-zinc-50 border-zinc-200"}`}>
                                      <div className="flex items-center gap-3">
                                        <TokenLogo symbol={token0Symbol} size={28} />
                                        <div>
                                          <p className="font-bold text-lg">{token0Symbol}</p>
                                          <p className={`text-xs font-mono font-medium ${isDark ? "text-zinc-505" : "text-zinc-400"}`}>
                                            Decimals: {pos.token0Info.decimals}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-black">{amt0Formatted.toFixed(pos.token0Info.decimals > 6 ? 4 : 2)}</p>
                                        <p className={`text-sm font-mono mt-0.5 ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>
                                          ≈ {formatCurrency(val0)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Token 1 */}
                                    <div className={`p-5 rounded-xl border flex justify-between items-center backdrop-blur-sm
                                      ${isDark ? "bg-[#1B2236]/40 border-[#2C364F]/25" : "bg-zinc-50 border-zinc-200"}`}>
                                      <div className="flex items-center gap-3">
                                        <TokenLogo symbol={token1Symbol} size={28} />
                                        <div>
                                          <p className="font-bold text-lg">{token1Symbol}</p>
                                          <p className={`text-xs font-mono font-medium ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>
                                            Decimals: {pos.token1Info.decimals}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-black">{amt1Formatted.toFixed(pos.token1Info.decimals > 6 ? 4 : 2)}</p>
                                        <p className={`text-sm font-mono mt-0.5 ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>
                                          ≈ {formatCurrency(val1)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Raw Liquidity and Position Details */}
                                <div className={`p-6 rounded-xl border flex flex-col md:flex-row justify-between items-center gap-4 text-sm backdrop-blur-sm
                                  ${isDark ? "bg-[#1B2236]/30 border-[#2C364F]/20 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-700"}`}>
                                  <div className="flex items-center gap-2">
                                    <Info size={16} className="text-cyan-400 shrink-0" />
                                    <span className="font-semibold">Raw Liquidity Amount:</span>
                                    <span className="font-mono text-cyan-400 font-black tracking-wide">
                                      {Number(formatUnits(pos.liquidity, 18)).toFixed(6)} units
                                    </span>
                                    <span className="text-xs font-mono opacity-60">({pos.liquidity.toString()})</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">Position Scope:</span>
                                    <span className="font-mono text-cyan-400 font-bold">{pos.tickUpper - pos.tickLower} ticks</span>
                                  </div>
                                </div>

                                {/* 2. Active Price Bounds and range visualization */}
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                    <div className={`p-4 rounded-xl border text-center ${isDark ? "bg-[#1B2236]/20 border-[#2C364F]/20" : "bg-zinc-50 border-zinc-200"}`}>
                                      <p className={`text-xs font-bold uppercase ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>Min Price</p>
                                      <p className="text-xl font-bold mt-1 font-mono">
                                        {pos.tickLower <= -887200 ? "0" : tickToPrice(pos.tickLower, pos.token0Info.decimals, pos.token1Info.decimals, true).toFixed(4)}
                                      </p>
                                      <p className={`text-xs font-mono mt-1 ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>Lower Tick: {pos.tickLower}</p>
                                    </div>

                                    <div className="text-center py-2">
                                      <div className={`text-sm font-semibold mb-1 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                                        Pool address
                                      </div>
                                      <a
                                        href={`https://testnet.mstscan.com/address/${pos.poolAddress}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`text-sm font-mono hover:underline flex items-center justify-center gap-1.5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
                                      >
                                        {pos.poolAddress.slice(0, 8)}...{pos.poolAddress.slice(-6)}
                                        <ExternalLink size={12} />
                                      </a>
                                    </div>

                                    <div className={`p-4 rounded-xl border text-center ${isDark ? "bg-[#1B2236]/20 border-[#2C364F]/20" : "bg-zinc-50 border-zinc-200"}`}>
                                      <p className={`text-xs font-bold uppercase ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>Max Price</p>
                                      <p className="text-xl font-bold mt-1 font-mono">
                                        {pos.tickUpper >= 887200 ? "∞" : tickToPrice(pos.tickUpper, pos.token0Info.decimals, pos.token1Info.decimals, true).toFixed(4)}
                                      </p>
                                      <p className={`text-xs font-mono mt-1 ${isDark ? "text-zinc-550" : "text-zinc-400"}`}>Upper Tick: {pos.tickUpper}</p>
                                    </div>
                                  </div>

                                  {/* Range Visualization for active position */}
                                  <div className={`p-6 rounded-2xl border backdrop-blur-sm space-y-4
                                     ${isDark ? "bg-[#131A2A]/25 border-[#2C364F]/20" : "bg-zinc-50 border-zinc-200"}`}>
                                    <div className="grid grid-cols-3 text-[10px] text-zinc-550 font-black uppercase tracking-wider">
                                      <span className="text-left">Min Price</span>
                                      <span className="text-cyan-400 font-bold text-center">Current Pool Price</span>
                                      <span className="text-right">Max Price</span>
                                    </div>
                                    {(() => {
                                      const rawPrice = Number(pos.poolSqrtPriceX96) / (2 ** 96);
                                      const ratioSquared = rawPrice * rawPrice;
                                      const posCurrentPrice = ratioSquared * Math.pow(10, pos.token0Info.decimals - pos.token1Info.decimals);
                                      const posPriceLower = pos.tickLower <= -887200 ? 0 : tickToPrice(pos.tickLower, pos.token0Info.decimals, pos.token1Info.decimals, true);
                                      const posPriceUpper = pos.tickUpper >= 887200 ? Infinity : tickToPrice(pos.tickUpper, pos.token0Info.decimals, pos.token1Info.decimals, true);

                                      const minBound = posCurrentPrice * 0.1;
                                      const maxBound = posCurrentPrice * 3.0;

                                      const getPercentage = (price: number) => {
                                        if (price <= minBound) return 0;
                                        if (price >= maxBound) return 100;
                                        return ((price - minBound) / (maxBound - minBound)) * 100;
                                      };

                                      const leftPercent = getPercentage(posPriceLower);
                                      const rightPercent = getPercentage(posPriceUpper);
                                      const widthPercent = Math.max(1.5, rightPercent - leftPercent);
                                      const currentPercent = getPercentage(posCurrentPrice);

                                      return (
                                        <>
                                          <div className="relative h-2 w-full rounded-full overflow-hidden bg-zinc-800">
                                            <div
                                              className={`absolute h-full rounded-full transition-all duration-300 ${pos.isInRange
                                                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                                : "bg-gradient-to-r from-amber-500 to-orange-400"
                                                }`}
                                              style={{
                                                left: `${leftPercent}%`,
                                                width: `${widthPercent}%`,
                                              }}
                                            />
                                            <div
                                              className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] z-10"
                                              style={{ left: `${currentPercent}%` }}
                                            />
                                          </div>
                                          <div className="grid grid-cols-3 text-xs font-bold font-mono">
                                            <span className="text-zinc-400 text-left">{pos.tickLower <= -887200 ? "0" : posPriceLower.toFixed(4)}</span>
                                            <span className="text-cyan-400 text-center">{posCurrentPrice.toFixed(4)}</span>
                                            <span className="text-zinc-400 text-right">{pos.tickUpper >= 887200 ? "∞" : posPriceUpper.toFixed(4)}</span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>


                                {/* 3. Inner Actions Layout (Add, Remove and Collect side-by-side/stacked) */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-[#2C364F]/20">

                                  {/* Actions column: Add/Increase Liquidity (Spans 6) */}
                                  <div className="lg:col-span-6 space-y-4">
                                    <h5 className="text-base font-bold flex items-center gap-2 text-emerald-400">
                                      <span className="w-1.5 h-4 bg-emerald-400 rounded-full" />
                                      Increase Liquidity
                                    </h5>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                                          Add {token0Symbol}
                                        </label>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            placeholder="0.0"
                                            value={addAmount0}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setAddAmount0(val);
                                              if (!val.trim()) {
                                                setAddAmount1("");
                                                return;
                                              }
                                              const valNum = Number(val);
                                              if (!isNaN(valNum) && pos.poolSqrtPriceX96 && pos.poolSqrtPriceX96 > 0n) {
                                                const amountRaw = parseUnits(val, pos.token0Info.decimals);
                                                const otherRaw = getOtherAmountForToken(
                                                  amountRaw,
                                                  0,
                                                  pos.poolSqrtPriceX96,
                                                  pos.tickLower,
                                                  pos.tickUpper
                                                );
                                                const otherVal = Number(formatUnits(otherRaw, pos.token1Info.decimals));
                                                setAddAmount1(formatToPrecision(otherVal, pos.token1Info.decimals));
                                              }
                                            }}
                                            disabled={isWorking}
                                            className={`w-full py-3 px-3.5 rounded-lg border text-sm font-medium outline-none bg-transparent transition
                                              ${isDark ? "border-[#2C364F]/50 focus:border-cyan-500/50" : "border-zinc-300 focus:border-cyan-500"}`}
                                          />
                                        </div>
                                        <span className="text-[11px] text-zinc-550 mt-1 block">Bal: {wmstBalance}</span>
                                        {addAmount0 !== "" && (Number(addAmount0) <= 0 || isNaN(Number(addAmount0))) && (
                                          <span className="text-[10px] text-red-500 mt-1 block font-semibold">
                                            Amount must be positive.
                                          </span>
                                        )}
                                      </div>

                                      <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                                          Add {token1Symbol}
                                        </label>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            placeholder="0.0"
                                            value={addAmount1}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setAddAmount1(val);
                                              if (!val.trim()) {
                                                setAddAmount0("");
                                                return;
                                              }
                                              const valNum = Number(val);
                                              if (!isNaN(valNum) && pos.poolSqrtPriceX96 && pos.poolSqrtPriceX96 > 0n) {
                                                const amountRaw = parseUnits(val, pos.token1Info.decimals);
                                                const otherRaw = getOtherAmountForToken(
                                                  amountRaw,
                                                  1,
                                                  pos.poolSqrtPriceX96,
                                                  pos.tickLower,
                                                  pos.tickUpper
                                                );
                                                const otherVal = Number(formatUnits(otherRaw, pos.token0Info.decimals));
                                                setAddAmount0(formatToPrecision(otherVal, pos.token0Info.decimals));
                                              }
                                            }}
                                            disabled={isWorking}
                                            className={`w-full py-3 px-3.5 rounded-lg border text-sm font-medium outline-none bg-transparent transition
                                              ${isDark ? "border-[#2C364F]/50 focus:border-cyan-500/50" : "border-zinc-300 focus:border-cyan-500"}`}
                                          />
                                        </div>
                                        <span className="text-[11px] text-zinc-550 mt-1 block">Bal: {usdcBalance}</span>
                                        {addAmount1 !== "" && (Number(addAmount1) <= 0 || isNaN(Number(addAmount1))) && (
                                          <span className="text-[10px] text-red-500 mt-1 block font-semibold">
                                            Amount must be positive.
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      onClick={handleAddLiquidity}
                                      disabled={isWorking || !addAmount0 || !addAmount1 || Number(addAmount0) <= 0 || Number(addAmount1) <= 0}
                                      className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]
                                        ${isWorking || !addAmount0 || !addAmount1 || Number(addAmount0) <= 0 || Number(addAmount1) <= 0
                                          ? isDark ? "bg-emerald-500/10 text-emerald-500/40 cursor-not-allowed" : "bg-emerald-500/10 text-emerald-600/40 cursor-not-allowed"
                                          : isDark ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5" : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 shadow-md shadow-emerald-500/5"
                                        }`}
                                    >
                                      {isWorking ? "Processing..." : "Increase Liquidity"}
                                    </button>
                                  </div>

                                  {/* Actions column: Remove/Collect (Spans 6) */}
                                  <div className="lg:col-span-6 space-y-6">
                                    {/* Remove block */}
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center">
                                        <h5 className="text-base font-bold flex items-center gap-2 text-red-400">
                                          <span className="w-1.5 h-4 bg-red-400 rounded-full" />
                                          Remove Liquidity
                                        </h5>
                                        <span className="text-sm font-black text-red-400">{removePercent}%</span>
                                      </div>

                                      <div className="space-y-2">
                                        <input
                                          type="range"
                                          min="1"
                                          max="100"
                                          value={removePercent}
                                          onChange={(e) => setRemovePercent(Number(e.target.value))}
                                          disabled={isWorking}
                                          className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition
                                            ${isDark ? "bg-[#2C364F]/30" : "bg-zinc-200"} accent-red-500`}
                                        />
                                        <div className="flex justify-between text-[10px] text-zinc-550 font-mono">
                                          <span>0%</span>
                                          <span>50%</span>
                                          <span>100%</span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={handleRemoveLiquidity}
                                        disabled={isWorking || !pos.liquidity || pos.liquidity === 0n}
                                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]
                                          ${isWorking || !pos.liquidity || pos.liquidity === 0n
                                            ? isDark ? "bg-red-500/10 text-red-500/40" : "bg-red-500/10 text-red-600/40"
                                            : isDark ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 shadow-md shadow-red-500/5" : "bg-red-500/15 hover:bg-red-500/25 text-red-600 shadow-md shadow-red-500/5"
                                          }`}
                                      >
                                        {isWorking ? "Processing..." : `Decrease Liquidity`}
                                      </button>
                                    </div>

                                    {/* Collect fee block */}
                                    <div className={`p-4 rounded-xl border space-y-4 backdrop-blur-sm
                                      ${isDark ? "bg-[#1B2236]/20 border-[#2C364F]/20" : "bg-zinc-50 border-zinc-200"}`}>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold">Unclaimed Fee Rewards</span>
                                        <button
                                          onClick={handleCollectFees}
                                          disabled={isWorking}
                                          className={`py-2 px-4 rounded-lg font-bold text-xs transition-all active:scale-[0.98]
                                            ${isWorking
                                              ? isDark ? "bg-amber-500/10 text-amber-500/40" : "bg-amber-500/10 text-amber-600/40"
                                              : isDark ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 shadow-md shadow-amber-500/5" : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 shadow-md shadow-amber-500/5"
                                            }`}
                                        >
                                          {isWorking ? "Collecting..." : "Collect Fees"}
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="flex items-center gap-1.5 font-semibold">
                                          <TokenLogo symbol={token0Symbol} size={16} />
                                          <span className="text-zinc-400">{token0Symbol}:</span>
                                          <span className="font-mono text-cyan-400">
                                            {Number(formatUnits(pos.tokensOwed0, pos.token0Info.decimals)).toFixed(5)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-semibold">
                                          <TokenLogo symbol={token1Symbol} size={16} />
                                          <span className="text-zinc-400">{token1Symbol}:</span>
                                          <span className="font-mono text-cyan-400">
                                            {Number(formatUnits(pos.tokensOwed1, pos.token1Info.decimals)).toFixed(5)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                  </div>

                                </div>

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

        {/* VIEW 2: CREATE POOL & INITIALIZE POSITION WIZARD */}
        {currentView === "create" && (
          <div className="space-y-6">

            {/* Navigation back and header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView("list")}
                className={`p-2.5 rounded-xl border transition-all ${isDark ? "bg-[#131A2A]/40 border-[#2C364F]/30 text-zinc-400 hover:text-white" : "bg-white border-zinc-200 text-zinc-655 hover:text-black"}`}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>
                  Step-by-Step wizard
                </span>
                <h2 className="text-3xl font-black">
                  {creationMode === "existing" ? "Add Liquidity to Pool" : "Create Pool & Initialize"}
                </h2>
              </div>
            </div>

            {/* Two Column Layout: Left indicator list & Right content card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Left Column: Progress Steps */}
              <div className="lg:col-span-4 space-y-4 w-full">
                <div className={`p-6 rounded-[24px] border backdrop-blur-md space-y-6
                                                    ${isDark ? "bg-[#0b0b14]/50 border-zinc-800/60" : "bg-white/50 border-zinc-200"}`}>

                  {/* Step 1 Indicator */}
                  <button
                    onClick={() => setWizardStep(1)}
                    className="flex items-center gap-4 text-left w-full group/step"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                                                        ${wizardStep === 1
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 scale-105"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {wizardStep > 1 ? "✓" : "1"}
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold tracking-wider ${wizardStep === 1 ? "text-cyan-400" : "text-zinc-500"}`}>Step 1</p>
                      <p className={`text-sm font-black transition-colors ${wizardStep === 1 ? "text-white" : "text-zinc-400 group-hover/step:text-zinc-200"}`}>Select token pair & fees</p>
                    </div>
                  </button>

                  {/* Connecting Line */}
                  <div className="w-[2px] h-6 bg-zinc-800 ml-4 -my-4" />

                  {/* Step 2 Indicator */}
                  <button
                    onClick={() => {
                      if (tokenA_Symbol && tokenB_Symbol) {
                        setWizardStep(2);
                      }
                    }}
                    disabled={!tokenA_Symbol || !tokenB_Symbol}
                    className={`flex items-center gap-4 text-left w-full group/step ${(!tokenA_Symbol || !tokenB_Symbol) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                                                        ${wizardStep === 2
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 scale-105"
                        : "bg-zinc-800 text-zinc-500 border border-zinc-700/50"
                      }`}
                    >
                      2
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold tracking-wider ${wizardStep === 2 ? "text-cyan-400" : "text-zinc-500"}`}>Step 2</p>
                      <p className={`text-sm font-black transition-colors ${wizardStep === 2 ? "text-white" : "text-zinc-400 group-hover/step:text-zinc-200"}`}>Set range & deposit amounts</p>
                    </div>
                  </button>

                </div>
              </div>

              {/* Right Column: Active Step Card */}
              <div className="lg:col-span-8 w-full">
                <motion.div
                  key={wizardStep}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-8 rounded-[30px] border shadow-2xl relative backdrop-blur-2xl transition-all duration-300 overflow-visible
                                                      ${isDark
                      ? "bg-[#0b0b14]/75 border-zinc-800/60 text-white"
                      : "bg-white/80 border-zinc-200 text-zinc-950"
                    }`}
                  style={{
                    boxShadow: isDark
                      ? "inset 0 1px 1px rgba(255,255,255,0.06), 0 20px 40px rgba(0,0,0,0.8)"
                      : "inset 0 1px 1px rgba(255,255,255,0.8), 0 20px 40px rgba(0,0,0,0.05)"
                  }}
                >
                  <div className="relative z-10 space-y-6">

                    {wizardStep === 1 ? (
                      <div className="space-y-6">
                        {/* Select Pair */}
                        <div>
                          <label className={`block text-base font-bold mb-3 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                            Select Pair
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setModalOpen("A")}
                              disabled={isWorking}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition bg-transparent
                                                                  ${isDark ? "border-[#2C364F]/50 hover:border-cyan-500/50" : "border-zinc-300 hover:border-cyan-500"}`}
                            >
                              <div className="flex items-center gap-2.5">
                                {tokenA_Symbol ? (
                                  <>
                                    <TokenLogo symbol={tokenA_Symbol} size={24} />
                                    <span className="text-lg font-bold">{tokenA_Symbol}</span>
                                  </>
                                ) : (
                                  <span className="text-zinc-550 font-semibold">Select Token A</span>
                                )}
                              </div>
                              <ChevronDown size={18} className="opacity-60" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setModalOpen("B")}
                              disabled={isWorking}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition bg-transparent
                                                                  ${isDark ? "border-[#2C364F]/50 hover:border-cyan-500/50" : "border-zinc-300 hover:border-cyan-500"}`}
                            >
                              <div className="flex items-center gap-2.5">
                                {tokenB_Symbol ? (
                                  <>
                                    <TokenLogo symbol={tokenB_Symbol} size={24} />
                                    <span className="text-lg font-bold">{tokenB_Symbol}</span>
                                  </>
                                ) : (
                                  <span className="text-zinc-550 font-semibold">Select Token B</span>
                                )}
                              </div>
                              <ChevronDown size={18} className="opacity-60" />
                            </button>
                          </div>
                        </div>

                        {/* Pool Fee Tier */}
                        <div>
                          <label className={`block text-base font-bold mb-3 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                            Pool Fee Tier
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { fee: 500, label: "0.05%", desc: "Best for very stable pairs", vol: "12% vol" },
                              { fee: 3000, label: "0.30%", desc: "Best for most pairs", vol: "83% vol" },
                              { fee: 10000, label: "1.00%", desc: "Best for exotic/volatile pairs", vol: "5% vol" }
                            ].map((item) => (
                              <button
                                key={item.fee}
                                type="button"
                                onClick={() => handleFeeTierChange(item.fee)}
                                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative overflow-hidden backdrop-blur-md
                                                                    ${initFee === item.fee
                                    ? isDark
                                      ? "bg-cyan-500/10 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/5"
                                      : "bg-cyan-500/10 border-cyan-500/40 text-zinc-950 shadow-md"
                                    : isDark
                                      ? "bg-[#131A2A]/40 border-[#2C364F]/30 text-zinc-400 hover:border-[#2C364F]/60"
                                      : "bg-white border-zinc-200 text-zinc-650 hover:border-zinc-300"
                                  }`}
                              >
                                {initFee === item.fee && (
                                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-md" />
                                )}
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-xl font-black">{item.label}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                                                                      ${initFee === item.fee
                                      ? "bg-cyan-400/25 text-cyan-400"
                                      : isDark ? "bg-[#1E2538] text-zinc-400" : "bg-zinc-100 text-zinc-550"
                                    }`}
                                  >
                                    {item.vol}
                                  </span>
                                </div>
                                <div>
                                  <p className={`text-xs font-semibold leading-relaxed ${initFee === item.fee ? "text-cyan-400/90" : "text-zinc-500"}`}>
                                    {item.desc}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Continue Button */}
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          disabled={!tokenA_Symbol || !tokenB_Symbol}
                          className={`w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-[0.98] mt-4
                                                              ${(!tokenA_Symbol || !tokenB_Symbol)
                              ? isDark ? "bg-zinc-800/40 text-zinc-500 cursor-not-allowed border border-zinc-800/20" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                              : isDark
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/15"
                                : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-650 hover:to-blue-700 text-white shadow-lg shadow-blue-500/10"
                            }`}
                        >
                          Continue
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Info block */}
                        {tokenA_Symbol && tokenB_Symbol && (
                          creationMode === "existing" && isPoolInitialized ? (
                            <div className={`p-5 rounded-xl border flex items-start gap-3 text-sm leading-relaxed
                                                                ${isDark ? "bg-[#1B2236]/30 border-emerald-500/25 text-zinc-400" : "bg-emerald-50/50 border-emerald-300/20 text-zinc-700"}`}>
                              <Info size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <p className={`font-bold mb-0.5 ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>Pool has been created, you can add new position</p>
                                This pool is initialized. The current rate is <span className="font-mono font-bold text-cyan-400">1 {tokenA_Symbol} = {poolCurrentPrice?.toFixed(4)} {tokenB_Symbol}</span>
                                {quoterPrice !== null && (
                                  <span> (Quote price: <span className="font-mono font-bold text-cyan-400">1 {tokenA_Symbol} = {quoterPrice.toFixed(4)} {tokenB_Symbol}</span>)</span>
                                )}. Input values are auto-aligned to guarantee all deposited funds are used.
                              </div>
                            </div>
                          ) : (
                            <div className={`p-5 rounded-xl border flex items-start gap-3 text-sm leading-relaxed
                                                                ${isDark ? "bg-[#1B2236]/30 border-cyan-500/25 text-zinc-400" : "bg-cyan-50/50 border-cyan-300/20 text-zinc-700"}`}>
                              <Info size={20} className="text-cyan-400 shrink-0 mt-0.5" />
                              <div>
                                <p className={`font-bold mb-0.5 ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>Create New Pool</p>
                                Pool does not exist, you can create new pool. Set a starting price and deploy the pool.
                              </div>
                            </div>
                          )
                        )}

                        {/* Two Column Sub-Layout for Step 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                          {/* Column 1: Deposit Amounts & APR */}
                          <div className="space-y-6">
                            {/* Deposit Amounts */}
                            <div className="space-y-4">
                              <label className={`block text-base font-bold -mb-1 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                                Deposit Amounts
                              </label>

                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <label className={`text-sm font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>{creationMode === "existing" ? "" : "Initial "}{tokenA_Symbol || "Token A"} amount</label>
                                  <span className="text-xs font-mono text-zinc-550">Bal: {wmstBalance}</span>
                                </div>
                                <div className={`relative flex items-center justify-between rounded-xl border transition bg-transparent p-2 pl-4 pr-2
                                                                    ${isDark ? "border-[#2C364F]/50 focus-within:border-cyan-500/50" : "border-zinc-300 focus-within:border-cyan-500"}
                                                                    ${isTokenInputDisabled(true) ? "opacity-50" : ""}`}
                                >
                                  <input
                                    id="tokenA-amount-input"
                                    type="text"
                                    placeholder=""
                                    value={initWmst}
                                    onChange={(e) => handleInitWmstChange(e.target.value)}
                                    onFocus={() => {
                                      if (initWmst === "0" || initWmst === "0.0") {
                                        setInitWmst("");
                                      }
                                    }}
                                    disabled={isWorking || !tokenA_Symbol || !tokenB_Symbol || isTokenInputDisabled(true)}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-base font-medium pr-3"
                                  />
                                  <button
                                    onClick={() => setModalOpen("A")}
                                    disabled={isWorking}
                                    className={`flex items-center gap-2 py-2 pl-3 pr-4 rounded-lg font-bold text-sm transition-colors relative z-10
                                                                        ${isDark
                                        ? "bg-[#181930] hover:bg-zinc-800 text-white"
                                        : "bg-zinc-100 hover:bg-zinc-200 text-zinc-950"
                                      }`}
                                  >
                                    {tokenA_Symbol ? (
                                      <>
                                        <TokenLogo symbol={tokenA_Symbol} size={20} />
                                        <span>{tokenA_Symbol}</span>
                                      </>
                                    ) : (
                                      <span className="text-zinc-400">Select Token</span>
                                    )}
                                    <ChevronDown size={14} className="opacity-60" />
                                  </button>
                                </div>
                                <div className="flex flex-col gap-1 mt-2 px-1 text-xs">
                                  {tokenA_Symbol && (
                                    <div className="flex justify-between items-center text-zinc-500 font-medium">
                                      <span>USD Value:</span>
                                      <span className="font-bold text-zinc-400 font-mono">${(Number(initWmst) * getTokenPrice(tokenA_Symbol)).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {quoterAmountB && (
                                    <div className={`flex justify-between items-center font-medium ${isDark ? "text-zinc-400" : "text-zinc-505"}`}>
                                      <span>Equivalent swap:</span>
                                      <span className="font-bold text-cyan-400">{quoterAmountB} {tokenB_Symbol}</span>
                                    </div>
                                  )}
                                </div>
                                {tokenA_Symbol && initWmst !== "" && !isTokenInputDisabled(true) && (Number(initWmst) <= 0 || isNaN(Number(initWmst))) && (
                                  <span className="text-xs text-red-500 mt-1.5 block font-semibold">
                                    {tokenA_Symbol} amount must be a positive number.
                                  </span>
                                )}
                              </div>

                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <label className={`text-sm font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>{creationMode === "existing" ? "" : "Initial "}{tokenB_Symbol || "Token B"} amount</label>
                                  <span className="text-xs font-mono text-zinc-550">Bal: {usdcBalance}</span>
                                </div>
                                <div className={`relative flex items-center justify-between rounded-xl border transition bg-transparent p-2 pl-4 pr-2
                                                                    ${isDark ? "border-[#2C364F]/50 focus-within:border-cyan-500/50" : "border-zinc-300 focus-within:border-cyan-500"}
                                                                    ${isTokenInputDisabled(false) ? "opacity-50" : ""}`}
                                >
                                  <input
                                    id="tokenB-amount-input"
                                    type="text"
                                    placeholder=""
                                    value={initUsdc}
                                    onChange={(e) => handleInitUsdcChange(e.target.value)}
                                    onFocus={() => {
                                      if (initUsdc === "0" || initUsdc === "0.0") {
                                        setInitUsdc("");
                                      }
                                    }}
                                    disabled={isWorking || !tokenA_Symbol || !tokenB_Symbol || isTokenInputDisabled(false)}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-base font-medium pr-3"
                                  />
                                  <button
                                    onClick={() => setModalOpen("B")}
                                    disabled={isWorking}
                                    className={`flex items-center gap-2 py-2 pl-3 pr-4 rounded-lg font-bold text-sm transition-colors relative z-10
                                                                        ${isDark
                                        ? "bg-[#181930] hover:bg-zinc-800 text-white"
                                        : "bg-zinc-100 hover:bg-zinc-200 text-zinc-955"
                                      }`}
                                  >
                                    {tokenB_Symbol ? (
                                      <>
                                        <TokenLogo symbol={tokenB_Symbol} size={20} />
                                        <span>{tokenB_Symbol}</span>
                                      </>
                                    ) : (
                                      <span className="text-zinc-400">Select Token</span>
                                    )}
                                    <ChevronDown size={14} className="opacity-60" />
                                  </button>
                                </div>
                                <div className="flex flex-col gap-1 mt-2 px-1 text-xs">
                                  {tokenB_Symbol && (
                                    <div className="flex justify-between items-center text-zinc-500 font-medium">
                                      <span>USD Value:</span>
                                      <span className="font-bold text-zinc-400 font-mono">${(Number(initUsdc) * getTokenPrice(tokenB_Symbol)).toFixed(2)}</span>
                                    </div>
                                  )}
                                  {quoterAmountA && (
                                    <div className={`flex justify-between items-center font-medium ${isDark ? "text-zinc-400" : "text-zinc-505"}`}>
                                      <span>Equivalent swap:</span>
                                      <span className="font-bold text-cyan-400">{quoterAmountA} {tokenA_Symbol}</span>
                                    </div>
                                  )}
                                </div>
                                {tokenB_Symbol && initUsdc !== "" && !isTokenInputDisabled(false) && (Number(initUsdc) <= 0 || isNaN(Number(initUsdc))) && (
                                  <span className="text-xs text-red-500 mt-1.5 block font-semibold">
                                    {tokenB_Symbol} amount must be a positive number.
                                  </span>
                                )}
                              </div>
                            </div>

                            {creationMode === "new" && tokenA_Symbol && tokenB_Symbol && initWmst && initUsdc && !isNaN(Number(initWmst)) && !isNaN(Number(initUsdc)) && Number(initWmst) > 0 && Number(initUsdc) > 0 && (
                              <div className={`p-4 rounded-xl border flex items-center justify-between text-sm backdrop-blur-sm
                                                                  ${isDark ? "bg-[#1B2236]/35 border-[#2C364F]/30 text-zinc-350" : "bg-zinc-50 border-zinc-200 text-zinc-700"}`}>
                                <span className="font-semibold text-zinc-400">Calculated Starting Price:</span>
                                <span className="font-mono font-bold text-cyan-400">
                                  1 {tokenA_Symbol} = {(Number(initUsdc) / Number(initWmst)).toFixed(4)} {tokenB_Symbol}
                                </span>
                              </div>
                            )}

                            {/* Estimated APR and daily earnings */}
                            {tokenA_Symbol && tokenB_Symbol && initWmst && initUsdc && !isNaN(Number(initWmst)) && !isNaN(Number(initUsdc)) && Number(initWmst) > 0 && Number(initUsdc) > 0 && (
                              <div className={`p-4 rounded-xl border grid grid-cols-2 gap-4 backdrop-blur-sm
                                                                  ${isDark ? "bg-[#1B2236]/25 border-cyan-500/20" : "bg-cyan-50/20 border-cyan-200"}`}>
                                <div>
                                  <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Estimated APR</span>
                                  <span className="text-xl font-black text-emerald-400 font-mono">
                                    {getEstimatedLiquidityAndAPR().apr.toFixed(2)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider block">Est. 24h Earnings</span>
                                  <span className="text-xl font-black text-cyan-400 font-mono">
                                    ${getEstimatedLiquidityAndAPR().dailyFee.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Column 2: Price Range boundaries */}
                          <div className="space-y-6">
                            {/* Price Range boundaries */}
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <label className={`text-base font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                                  Price Range boundaries
                                </label>

                                {/* Range Mode Switch */}
                                <div className={`flex rounded-xl p-0.5 border backdrop-blur-md transition-all
                                                                    ${isDark ? "bg-[#131A2A]/40 border-[#2C364F]/30" : "bg-white border-zinc-200"}`}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRangeMode("custom");
                                      setRangeStrategy("stable");
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                                                        ${rangeMode === "custom"
                                        ? isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-zinc-100 text-zinc-950 border border-zinc-200"
                                        : "text-zinc-400 hover:text-zinc-200"}`}
                                  >
                                    Custom
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRangeMode("full");
                                      setRangeStrategy("full");
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                                                        ${rangeMode === "full"
                                        ? isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-zinc-100 text-zinc-950 border border-zinc-200"
                                        : "text-zinc-400 hover:text-zinc-200"}`}
                                  >
                                    Full
                                  </button>
                                </div>
                              </div>

                              {rangeMode === "custom" && (
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setRangeStrategy("stable")}
                                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all
                                                                        ${rangeStrategy === "stable"
                                        ? isDark ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-zinc-100 border-zinc-300 text-zinc-950"
                                        : isDark ? "bg-[#131A2A]/20 border-transparent text-zinc-500 hover:text-zinc-300" : "bg-zinc-50 border-transparent text-zinc-505 hover:text-zinc-700"
                                      }`}
                                  >
                                    Stable (±3 ticks)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRangeStrategy("wide")}
                                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all
                                                                        ${rangeStrategy === "wide"
                                        ? isDark ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-zinc-100 border-zinc-300 text-zinc-950"
                                        : isDark ? "bg-[#131A2A]/20 border-transparent text-zinc-500 hover:text-zinc-300" : "bg-zinc-50 border-transparent text-zinc-505 hover:text-zinc-700"
                                      }`}
                                  >
                                    Wide (-50% to +100%)
                                  </button>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={rangeMode === "full" ? "0" : priceLower}
                                      onChange={(e) => handlePriceLowerChange(e.target.value)}
                                      onBlur={handlePriceLowerBlur}
                                      disabled={isWorking || rangeMode === "full"}
                                      style={{ paddingRight: "78px" }}
                                      className={`w-full py-3 pl-4 rounded-xl border text-sm font-mono outline-none bg-transparent transition
                                                                          ${isDark
                                          ? "border-[#2C364F]/50 focus-within:border-cyan-500/50 disabled:bg-[#131A2A]/30 disabled:border-zinc-800/40"
                                          : "border-zinc-300 focus-within:border-cyan-500 disabled:bg-zinc-100/50 disabled:border-zinc-200"}`}
                                    />
                                    {rangeMode !== "full" && (
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500/80 uppercase tracking-wide pointer-events-none">
                                        {tokenB_Symbol}/{tokenA_Symbol}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center mt-1.5 px-1">
                                    <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wide">Min Price</span>
                                    <span className={`text-[10px] font-black ${Number(getDeviationLabel(true).replace("%", "")) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                      {getDeviationLabel(true)}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={rangeMode === "full" ? "Infinity" : priceUpper}
                                      onChange={(e) => handlePriceUpperChange(e.target.value)}
                                      onBlur={handlePriceUpperBlur}
                                      disabled={isWorking || rangeMode === "full"}
                                      style={{ paddingRight: "78px" }}
                                      className={`w-full py-3 pl-4 rounded-xl border text-sm font-mono outline-none bg-transparent transition
                                                                          ${isDark
                                          ? "border-[#2C364F]/50 focus-within:border-cyan-500/50 disabled:bg-[#131A2A]/30 disabled:border-zinc-800/40"
                                          : "border-zinc-300 focus-within:border-cyan-500 disabled:bg-zinc-100/50 disabled:border-zinc-200"}`}
                                    />
                                    {rangeMode !== "full" && (
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500/80 uppercase tracking-wide pointer-events-none">
                                        {tokenB_Symbol}/{tokenA_Symbol}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center mt-1.5 px-1">
                                    <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wide">Max Price</span>
                                    <span className={`text-[10px] font-black ${Number(getDeviationLabel(false).replace("%", "")) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                      {getDeviationLabel(false)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Range Bar */}
                              {(() => {
                                const currentPriceVal = poolCurrentPrice || 1.0;
                                const pLower = rangeMode === "full" ? 0 : Number(priceLower) || 0;
                                const pUpper = rangeMode === "full" ? Infinity : Number(priceUpper) || Infinity;
                                const isInRange = currentPriceVal >= pLower && currentPriceVal <= pUpper;

                                const minBound = currentPriceVal * 0.1;
                                const maxBound = currentPriceVal * 3.0;

                                const getPercentage = (price) => {
                                  if (price <= minBound) return 0;
                                  if (price >= maxBound) return 100;
                                  return ((price - minBound) / (maxBound - minBound)) * 100;
                                };

                                const leftPercent = getPercentage(pLower);
                                const rightPercent = getPercentage(pUpper);
                                const widthPercent = Math.max(1.5, rightPercent - leftPercent);
                                const currentPercent = getPercentage(currentPriceVal);

                                return (
                                  <div className={`p-6 rounded-2xl border backdrop-blur-sm space-y-4
                                                                      ${isDark ? "bg-[#131A2A]/25 border-[#2C364F]/20" : "bg-zinc-50 border-zinc-200"}`}>
                                    <div className="grid grid-cols-3 text-[10px] text-zinc-550 font-black uppercase tracking-wider">
                                      <span className="text-left">Min Price</span>
                                      <span className="text-cyan-400 font-bold text-center">Current Price</span>
                                      <span className="text-right">Max Price</span>
                                    </div>
                                    <div className="relative h-2 w-full rounded-full overflow-hidden bg-zinc-800">
                                      <div
                                        className={`absolute h-full rounded-full transition-all duration-300 ${isInRange
                                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                          : "bg-gradient-to-r from-amber-500 to-orange-400"
                                          }`}
                                        style={{
                                          left: `${leftPercent}%`,
                                          width: `${widthPercent}%`,
                                        }}
                                      />
                                      <div
                                        className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] z-10"
                                        style={{
                                          left: `${currentPercent}%`,
                                        }}
                                      />
                                    </div>
                                    <div className="grid grid-cols-3 text-xs font-mono font-bold">
                                      <span className="text-left text-zinc-400">{rangeMode === "full" ? "0" : pLower.toFixed(4)}</span>
                                      <span className="text-cyan-400 text-center">{currentPriceVal.toFixed(4)}</span>
                                      <span className="text-right text-zinc-400">{rangeMode === "full" ? "Infinity" : pUpper.toFixed(4)}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons (Back + Confirm) */}
                        <div className="flex gap-4 items-center pt-4">
                          <button
                            type="button"
                            onClick={() => setWizardStep(1)}
                            className={`py-4 px-6 rounded-xl font-bold text-base tracking-wide transition-all active:scale-[0.98] border
                                                                ${isDark
                                ? "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                : "border-zinc-200 text-zinc-650 hover:bg-zinc-150"
                              }`}
                          >
                            Back
                          </button>

                          <button
                            onClick={() => {
                              checkCreateSteps();
                              setPendingAction("create");
                            }}
                            disabled={
                              isWorking ||
                              !tokenA_Symbol ||
                              !tokenB_Symbol ||
                              (creationMode === "new"
                                ? (!initWmst || !initUsdc || Number(initWmst) <= 0 || Number(initUsdc) <= 0)
                                : ((!initWmst && !initUsdc) || (Number(initWmst) <= 0 && Number(initUsdc) <= 0))
                              ) ||
                              (creationMode === "existing" && !isPoolInitialized)
                            }
                            className={`flex-1 py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-[0.98]
                                                                ${isWorking ||
                                !tokenA_Symbol ||
                                !tokenB_Symbol ||
                                (creationMode === "new"
                                  ? (!initWmst || !initUsdc || Number(initWmst) <= 0 || Number(initUsdc) <= 0)
                                  : ((!initWmst && !initUsdc) || (Number(initWmst) <= 0 && Number(initUsdc) <= 0))
                                ) ||
                                (creationMode === "existing" && !isPoolInitialized)
                                ? isDark
                                  ? "border border-zinc-800 bg-zinc-900/30 text-zinc-650 cursor-not-allowed"
                                  : "border border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed"
                                : isDark
                                  ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:via-blue-500 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/25"
                                  : "bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:brightness-110 text-white shadow-lg shadow-blue-500/20"
                              }`}
                          >
                            {!tokenA_Symbol || !tokenB_Symbol
                              ? "Select Tokens to Continue"
                              : isWorking
                                ? creationMode === "new" ? "Creating Pool..." : "Adding Position..."
                                : creationMode === "new" ? "Create Pool" : "Add Position"
                            }
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic transaction notifications */}
        <AnimatePresence>
          {statusText && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              className="overflow-hidden"
            >
              <div
                className={`p-5 rounded-2xl border backdrop-blur-sm text-sm font-medium leading-relaxed shadow-lg
                  ${statusText.includes("minted") || statusText.includes("added") || statusText.includes("removed") || statusText.includes("collected") || statusText.includes("successfully")
                    ? isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/5" : "bg-emerald-50 border-emerald-500/20 text-emerald-800"
                    : isDark ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-blue-500/5" : "bg-blue-50 border-blue-500/20 text-blue-800"
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold flex items-center gap-2">
                    <ShieldCheck size={18} className="shrink-0" />
                    {statusText}
                  </span>
                  <button
                    onClick={() => setStatusText("")}
                    className={`text-xs font-bold px-2 py-1 rounded hover:bg-black/10 transition`}
                  >
                    ✕
                  </button>
                </div>
                {txHash && (
                  <div className="text-xs font-mono mt-2 pt-2 border-t border-current/10">
                    <a
                      href={`https://testnet.mstscan.com/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 hover:underline"
                    >
                      Tx hash: {txHash.slice(0, 18)}...{txHash.slice(-14)}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review Transaction Modal */}
        <AnimatePresence>
          {pendingAction && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pt-[120px]">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!isWorking) {
                    setPendingAction(null);
                    setCreateSteps([]);
                  }
                }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`relative w-full max-w-md rounded-[24px] p-5 shadow-2xl border
                  ${isDark ? "bg-[#0b0b14]/95 border-zinc-800/80 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"}
                `}
                style={{
                  boxShadow: isDark
                    ? "inset 0 1px 1px rgba(255,255,255,0.06), 0 20px 40px rgba(0,0,0,0.8)"
                    : "inset 0 1px 1px rgba(255,255,255,0.8), 0 20px 40px rgba(0,0,0,0.05)"
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold">Review Transaction</h3>
                  <button
                    onClick={() => {
                      if (!isWorking) {
                        setPendingAction(null);
                        setCreateSteps([]);
                      }
                    }}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {pendingAction === "create" && (
                  <div className="mb-4 space-y-3">
                    <p className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                      You are about to initiate a blockchain transaction. Please review the details below.
                    </p>
                    <div className={`p-3 rounded-2xl border space-y-2 font-medium text-sm
                      ${isDark ? "bg-[#1B2236]/30 border-[#2C364F]/50" : "bg-zinc-50 border-zinc-200"}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Action</span>
                        <span className="font-bold text-cyan-500">
                          {creationMode === "existing" ? "Add Liquidity" : "Create Pool & Add Liquidity"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">{tokenA_Symbol} Amount</span>
                        <span className="font-bold">{initWmst}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">{tokenB_Symbol} Amount</span>
                        <span className="font-bold">{initUsdc}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Fee Tier</span>
                        <span className="font-bold">{(initFee / 10000).toFixed(2)}%</span>
                      </div>
                    </div>

                    {/* Step-by-Step Confirmations Container */}
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Required Steps
                      </h4>

                      {loadingCreateSteps ? (
                        <div className="flex items-center justify-center py-4 gap-2">
                          <Loader2 className="animate-spin text-cyan-400 h-5 w-5" />
                          <span className="text-xs font-mono text-zinc-500">Estimating required steps...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {createSteps.map((step, idx) => {
                            const isCompleted = step.status === "completed";
                            const isCurrent = idx === activeCreateStepIndex;
                            const isWorkingStep = step.status === "working";
                            const isFailed = step.status === "failed";

                            return (
                              <div
                                key={step.id}
                                className={`flex items-start justify-between p-2.5 rounded-[14px] border transition-all duration-300
                                  ${isCompleted
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                                    : isCurrent
                                      ? isDark ? "bg-[#1C2438] border-cyan-500/30 text-white" : "bg-cyan-50 border-cyan-300 text-zinc-900"
                                      : "bg-transparent border-zinc-800/40 text-zinc-550 opacity-60"
                                  }`}
                              >
                                <div className="flex gap-3 min-w-0">
                                  <div className="mt-0.5 shrink-0">
                                    {isCompleted ? (
                                      <CheckCircle2 size={18} className="text-emerald-400" />
                                    ) : isWorkingStep ? (
                                      <Loader2 size={18} className="text-cyan-400 animate-spin" />
                                    ) : isFailed ? (
                                      <XCircle size={18} className="text-rose-500" />
                                    ) : (
                                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold
                                        ${isCurrent ? "border-cyan-400 text-cyan-400" : "border-zinc-600 text-zinc-650"}`}
                                      >
                                        {idx + 1}
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="text-sm font-bold truncate">{step.label}</div>
                                    <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{step.description}</div>
                                    {step.error && (
                                      <div className="text-[11px] font-bold text-rose-500 mt-1 font-mono break-words">{step.error}</div>
                                    )}
                                  </div>
                                </div>

                                {/* Active step action button */}
                                {isCurrent && !isWorking && (
                                  <button
                                    onClick={() => executeCreateStep(idx)}
                                    className={`ml-3 py-1.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0
                                      ${isDark
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/10"
                                        : "bg-cyan-500 hover:bg-cyan-600 text-white"
                                      }`}
                                  >
                                    {step.id.startsWith("approve") ? "Approve" : "Confirm"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MstTokenModal rendering */}
        <MstTokenModal
          isOpen={modalOpen !== null}
          onClose={() => setModalOpen(null)}
          onSelect={handleTokenSelect}
          selectedToken={modalOpen === "A" ? tokenA_Symbol : (modalOpen === "B" ? tokenB_Symbol : "")}
          theme={theme}
          excludeTokens={[NATIVE_TOKEN_SYMBOL]}
        />

      </main>
    </div>
  );
}
