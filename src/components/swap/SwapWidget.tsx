import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ChevronDown, ArrowDown, Info, Loader2, Sparkles, CheckCircle2, ExternalLink, XCircle, X } from "lucide-react";
import { formatUnits, parseUnits, type Address, decodeEventLog, encodePacked } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract, useBalance } from "wagmi";
import { getToken, displayTokenSymbol, CONTRACTS, erc20Abi, quoterV2Abi, swapRouterAbi, rapidexV3FactoryAbi, swapEventAbi, V3_FEE, ZERO_SQRT_PRICE_LIMIT, API_BASE, TOKENS, NATIVE_TOKEN_SYMBOL } from "../../config/contracts";
import { swapService } from "../../services/swap.service";
import { mstChain } from "../../config/chains";
import { useSwapStore } from "../../store/swapStore";
import { TokenLogo } from "./TokenLogos";
import { MstTokenModal } from "./MstTokenModal";
import { MstSwapSettings } from "./MstSwapSettings";
import { useMagnetic } from "../../hooks/useMagnetic";
import { NumberTicker } from "../ui/NumberTicker";
import { usePriceWs } from "../../hooks/usePriceWs";

// Token price provider without static fallbacks


interface SwapWidgetProps {
  theme: "light" | "dark";
}

// Particle interface for local custom explosion
interface CustomParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

interface RouteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bestRoute: {
    routeType: "single" | "multi" | "wrap" | "unwrap" | null;
    fee?: number;
    fees?: number[];
    path?: Address;
    outputAmount: bigint;
    tokenMid?: Address;
  } | null;
  tokenIn: string;
  tokenOut: string;
  theme: "light" | "dark";
}

function RouteDetailsModal({ isOpen, onClose, bestRoute, tokenIn, tokenOut, theme }: RouteDetailsModalProps) {
  if (!isOpen || !bestRoute) return null;
  const isDark = theme === "dark";

  const pathTokens = useMemo(() => {
    if (bestRoute.routeType === "wrap") {
      return ["MST", "WMST"];
    }
    if (bestRoute.routeType === "unwrap") {
      return ["WMST", "MST"];
    }
    if (bestRoute.routeType === "single") {
      return [tokenIn, tokenOut];
    }
    if (bestRoute.routeType === "multi" && bestRoute.tokenMid) {
      const tokenMidAddress = bestRoute.tokenMid;
      const midToken = TOKENS.find(t => t.address?.toLowerCase() === tokenMidAddress.toLowerCase());
      return [tokenIn, midToken?.symbol || "USDC", tokenOut];
    }
    return [tokenIn, tokenOut];
  }, [bestRoute, tokenIn, tokenOut]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`w-full max-w-[400px] p-6 rounded-[24px] border shadow-2xl relative z-10 overflow-hidden
            ${isDark ? "bg-[#0f0f1b]/95 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-950"}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              Routing Details
            </h3>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer
                ${isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"}`}
            >
              <X size={16} />
            </button>
          </div>

          <p className={`text-xs leading-relaxed mb-6 font-bold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Your trade is routed via the path below to secure the maximum output rate and lowest price impact.
          </p>

          <div className="relative flex items-center justify-between py-6 px-3 mb-6 bg-zinc-500/5 rounded-2xl border border-zinc-500/10">
            {pathTokens.map((tokenSymbol, index) => {
              const isLast = index === pathTokens.length - 1;
              return (
                <React.Fragment key={tokenSymbol}>
                  <div className="flex flex-col items-center gap-1.5 z-10">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-full border shadow-md
                      ${isDark ? "bg-[#181930] border-zinc-800" : "bg-white border-zinc-200"}`}
                    >
                      <TokenLogo symbol={tokenSymbol} size={28} />
                    </div>
                    <span className="text-xs font-mono font-bold">{displayTokenSymbol(tokenSymbol)}</span>
                  </div>

                  {!isLast && (
                    <div className="flex-1 relative flex flex-col items-center justify-center mx-1">
                      <span className={`text-[10px] font-mono font-bold py-0.5 px-1.5 rounded bg-cyan-400/10 text-cyan-400 mb-1 border border-cyan-400/20`}>
                        {bestRoute.routeType === "multi" && bestRoute.fees
                          ? `${(bestRoute.fees[index] / 10000).toFixed(2)}%`
                          : bestRoute.routeType === "single" && bestRoute.fee !== undefined
                            ? `${(bestRoute.fee / 10000).toFixed(2)}%`
                            : "0%"}
                      </span>
                      <div className="w-full h-0.5 bg-zinc-800 relative overflow-hidden">
                        <motion.div
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 font-bold">Router Type:</span>
              <span className="font-mono font-bold text-cyan-400 capitalize">
                {bestRoute.routeType === "single" ? "V3 Single Hop" : bestRoute.routeType === "multi" ? "V3 Multi-Hop" : bestRoute.routeType}
              </span>
            </div>
            {bestRoute.routeType === "multi" && bestRoute.tokenMid && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold">Intermediate Hop:</span>
                <span className={`font-mono text-[10px] font-bold p-1 rounded bg-zinc-800/40 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  {bestRoute.tokenMid.substring(0, 6)}...{bestRoute.tokenMid.substring(38)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 font-bold">Best Output Rate:</span>
              <span className="font-mono font-bold text-emerald-400">
                {Number(formatUnits(bestRoute.outputAmount, bestRoute.routeType === "wrap" ? 18 : (bestRoute.routeType === "unwrap" ? 18 : (TOKENS.find(t => t.symbol === tokenOut)?.decimals ?? 18)))).toFixed(4)} {displayTokenSymbol(tokenOut)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function SwapWidget({ theme }: SwapWidgetProps) {
  // Real WAGMI integrations
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const navigate = useNavigate();

  // WAGMI balance fetch
  const { data: nativeBalanceData, refetch: refetchNativeBalance } = useBalance({ address });

  // Real-time WebSocket refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  usePriceWs(() => {
    refetchNativeBalance();
    setRefreshTrigger((prev) => prev + 1);
  });

  const {
    tokenIn,
    tokenOut,
    amountIn,
    slippageBps,
    deadlineMins,
    useRouterApi,
    setAmountIn,
    setTokenIn,
    setTokenOut,
    switchTokens,
    setSlippage
  } = useSwapStore();

  const [amountOut, setAmountOut] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState<"in" | "out" | null>(null);

  // Swap transaction states
  const [isWorking, setIsWorking] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [txHash, setTxHash] = useState("");
  const [quotedOut, setQuotedOut] = useState<bigint | null>(null);
  const [bestRoute, setBestRoute] = useState<{
    routeType: "single" | "multi" | "wrap" | "unwrap" | null;
    fee?: number;
    fees?: number[];
    path?: Address;
    outputAmount: bigint;
    tokenMid?: Address;
  } | null>(null);
  const [routeDetailsOpen, setRouteDetailsOpen] = useState(false);

  interface SwapStep {
    id: "wrap" | "approve" | "swap" | "unwrap";
    label: string;
    statusText: string;
  }
  const [steps, setSteps] = useState<SwapStep[]>([]);

  interface ToastState {
    open: boolean;
    type: "success" | "error";
    title: string;
    description: string;
    txHash?: string;
  }
  const [toast, setToast] = useState<ToastState>({
    open: false,
    type: "success",
    title: "",
    description: ""
  });

  useEffect(() => {
    if (toast.open) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, open: false }));
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toast.open]);

  // Creative states
  const [arrowRotation, setArrowRotation] = useState(0);
  const [inputOrder, setInputOrder] = useState<("in" | "out")[]>(["in", "out"]);
  const [particles, setParticles] = useState<CustomParticle[]>([]);


  const isDark = theme === "dark";

  // Magnetic pulls using our GSAP useMagnetic hook
  const buttonMagneticRef = useMagnetic({ strength: 0.2, duration: 0.4 });
  const arrowMagneticRef = useMagnetic({ strength: 0.35, duration: 0.5 });
  const tokenInMagneticRef = useMagnetic({ strength: 0.25, duration: 0.5 });
  const tokenOutMagneticRef = useMagnetic({ strength: 0.25, duration: 0.5 });

  // Inputs hover-glow tracking coords
  const [inCoords, setInCoords] = useState({ x: 0, y: 0 });
  const [outCoords, setOutCoords] = useState({ x: 0, y: 0 });
  const [isInHovered, setIsInHovered] = useState(false);
  const [isOutHovered, setIsOutHovered] = useState(false);

  const [liveMstPrice, setLiveMstPrice] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const client = publicClient;
    if (!client) return;

    async function fetchMstPrice(c: NonNullable<typeof client>) {
      try {
        const wmstAddress = CONTRACTS.wmst;
        const usdcAddress = CONTRACTS.usdc;
        const wmstToken = getToken("WMST");
        const usdcToken = getToken("USDC");
        const wmstDecimals = wmstToken?.decimals ?? 18;
        const usdcDecimals = usdcToken?.decimals ?? 18;
        if (!wmstAddress || !usdcAddress) return;

        const oneUnitRaw = parseUnits("1", wmstDecimals);
        const { result } = await c.simulateContract({
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
          const price = Number(formatUnits(outRaw, usdcDecimals));
          setLiveMstPrice(price);
        }
      } catch (err) {
        console.error("Error fetching MST price", err);
      }
    }

    fetchMstPrice(client);
    const interval = setInterval(() => fetchMstPrice(client), 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [chainId]);

  // Dynamic step determination based on input conditions & allowance
  useEffect(() => {
    let active = true;
    async function determineSwapSteps() {
      if (!isConnected || !address || !publicClient || !amountIn || Number(amountIn) <= 0 || !inputToken || !outputToken) {
        if (active) setSteps([]);
        return;
      }

      if (tokenIn === NATIVE_TOKEN_SYMBOL && tokenOut === "USDC") {
        if (active) setSteps([]);
        return;
      }

      const amountRaw = parseUnits(amountIn, inputToken.decimals);
      const newSteps: SwapStep[] = [];

      // MST ⇄ WMST are direct wrapping/unwrapping steps
      if (tokenIn === "MST" && tokenOut === "WMST") {
        if (active) setSteps([{ id: "wrap", label: "Wrap MST to WMST", statusText: "Wrapping MST..." }]);
        return;
      }
      if (tokenIn === "WMST" && tokenOut === "MST") {
        if (active) setSteps([{ id: "unwrap", label: "Unwrap WMST to MST", statusText: "Unwrapping WMST..." }]);
        return;
      }

      // Step 1: Wrap native MST if it is input
      if (tokenIn === "MST") {
        newSteps.push({ id: "wrap", label: "Wrap MST to WMST", statusText: "Wrapping MST..." });
      }

      // Step 2: Check token allowance (approve if needed)
      const approveAddress = (tokenIn === "MST" ? CONTRACTS.wmst : inputToken.address) as Address;
      if (approveAddress) {
        try {
          const allowance = await publicClient.readContract({
            address: approveAddress,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, CONTRACTS.swapRouter]
          });
          if (allowance < amountRaw) {
            const tokenSymbol = tokenIn === "MST" ? "WMST" : tokenIn;
            newSteps.push({ id: "approve", label: `Allow ${tokenSymbol}`, statusText: `Allowing ${tokenSymbol} Spending...` });
          }
        } catch (err) {
          console.error("Error reading allowance:", err);
        }
      }

      // Step 3: Swap step
      newSteps.push({
        id: "swap",
        label: "Confirm Swap",
        statusText: `Swapping ${tokenIn} for ${tokenOut}...`
      });

      // Step 4: Unwrap to native MST if it is output
      if (tokenOut === "MST") {
        newSteps.push({ id: "unwrap", label: "Unwrap WMST to MST", statusText: "Unwrapping WMST..." });
      }

      if (active) {
        setSteps(newSteps);
      }
    }

    determineSwapSteps();

    return () => {
      active = false;
    };
  }, [amountIn, tokenIn, tokenOut, address, isConnected, chainId, refreshTrigger]);

  const refreshSteps = async () => {
    if (!isConnected || !address || !publicClient || !amountIn || Number(amountIn) <= 0 || !inputToken || !outputToken) {
      setSteps([]);
      return;
    }

    const amountRaw = parseUnits(amountIn, inputToken.decimals);
    const newSteps: SwapStep[] = [];

    if (tokenIn === "MST" && tokenOut === "WMST") {
      setSteps([{ id: "wrap", label: "Wrap MST to WMST", statusText: "Wrapping MST..." }]);
      return;
    }
    if (tokenIn === "WMST" && tokenOut === "MST") {
      setSteps([{ id: "unwrap", label: "Unwrap WMST to MST", statusText: "Unwrapping WMST..." }]);
      return;
    }

    if (tokenIn === "MST") {
      newSteps.push({ id: "wrap", label: "Wrap MST to WMST", statusText: "Wrapping MST..." });
    }

    const approveAddress = (tokenIn === "MST" ? CONTRACTS.wmst : inputToken.address) as Address;
    if (approveAddress) {
      try {
        const allowance = await publicClient.readContract({
          address: approveAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, CONTRACTS.swapRouter]
        });
        if (allowance < amountRaw) {
          const tokenSymbol = tokenIn === "MST" ? "WMST" : tokenIn;
          newSteps.push({ id: "approve", label: `Allow ${tokenSymbol}`, statusText: `Allowing ${tokenSymbol} Spending...` });
        }
      } catch (err) {
        console.error("Error reading allowance:", err);
      }
    }

    newSteps.push({
      id: "swap",
      label: "Confirm Swap",
      statusText: `Swapping ${tokenIn} for ${tokenOut}...`
    });

    if (tokenOut === "MST") {
      newSteps.push({ id: "unwrap", label: "Unwrap WMST to MST", statusText: "Unwrapping WMST..." });
    }

    setSteps(newSteps);
  };

  const getTokenPrice = (symbol: string) => {
    if (symbol === "USDC") return 1.0;
    if (symbol === "MST" || symbol === "WMST") return liveMstPrice;
    return 0.0;
  };

  // Sync token properties
  const inputToken = useMemo(() => {
    if (tokenIn === "MST") {
      return { symbol: "MST", name: "MST Native Token", decimals: 18, address: undefined as any };
    }
    return getToken(tokenIn);
  }, [tokenIn]);

  const outputToken = useMemo(() => {
    if (tokenOut === "MST") {
      return { symbol: "MST", name: "MST Native Token", decimals: 18, address: undefined as any };
    }
    return getToken(tokenOut);
  }, [tokenOut]);

  const amountNumber = Number(amountIn);
  const hasMissingTokenAddress =
    (tokenIn !== "MST" && !inputToken?.address) ||
    (tokenOut !== "MST" && !outputToken?.address);
  const isReadyAmount = amountIn && Number.isFinite(amountNumber) && amountNumber > 0;

  // Retrieve balances
  const [balanceIn, setBalanceIn] = useState("0.00");
  const [balanceOut, setBalanceOut] = useState("0.00");

  useEffect(() => {
    let active = true;
    async function fetchBalance() {
      if (!isConnected || !address || !publicClient) return;

      if (tokenIn === "MST") {
        if (active) {
          const res = await refetchNativeBalance();
          if (res.data) {
            setBalanceIn(Number(res.data.formatted).toFixed(4));
          }
        }
        return;
      }

      if (!inputToken?.address) return;
      try {
        const rawBalance = (await publicClient.readContract({
          address: inputToken.address as Address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as Address]
        })) as bigint;

        if (active) {
          setBalanceIn(Number(formatUnits(rawBalance, inputToken.decimals)).toFixed(4));
        }
      } catch (err) {
        if (active) setBalanceIn("0.00");
      }
    }

    fetchBalance();
    return () => {
      active = false;
    };
  }, [address, isConnected, tokenIn, inputToken, chainId, nativeBalanceData, refreshTrigger]);

  useEffect(() => {
    let active = true;
    async function fetchBalanceOut() {
      if (!isConnected || !address || !publicClient) return;

      if (tokenOut === "MST") {
        if (active) {
          const res = await refetchNativeBalance();
          if (res.data) {
            setBalanceOut(Number(res.data.formatted).toFixed(4));
          }
        }
        return;
      }

      if (!outputToken?.address) return;
      try {
        const rawBalance = (await publicClient.readContract({
          address: outputToken.address as Address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as Address]
        })) as bigint;

        if (active) {
          setBalanceOut(Number(formatUnits(rawBalance, outputToken.decimals)).toFixed(4));
        }
      } catch (err) {
        if (active) setBalanceOut("0.00");
      }
    }

    fetchBalanceOut();
    return () => {
      active = false;
    };
  }, [address, isConnected, tokenOut, outputToken, chainId, nativeBalanceData, refreshTrigger]);

  // Handle Concentrated Pool Quotes
  useEffect(() => {
    if (!isReadyAmount || !publicClient || !inputToken || !outputToken) {
      setQuotedOut(null);
      setAmountOut("");
      setBestRoute(null);
      return;
    }

    if (tokenIn === NATIVE_TOKEN_SYMBOL && tokenOut === "USDC") {
      setQuotedOut(null);
      setAmountOut("");
      setBestRoute(null);
      return;
    }

    if (
      (tokenIn === "MST" && tokenOut === "WMST") ||
      (tokenIn === "WMST" && tokenOut === "MST")
    ) {
      const amtOut = parseUnits(amountIn, outputToken?.decimals ?? 18);
      setAmountOut(amountIn);
      setQuotedOut(amtOut);
      setBestRoute({
        routeType: tokenIn === "MST" ? "wrap" : "unwrap",
        outputAmount: amtOut
      });
      return;
    }

    let active = true;
    const delayDebounce = setTimeout(async () => {
      try {
        const quoteInAddress = (tokenIn === "MST" ? CONTRACTS.wmst : inputToken.address) as Address;
        const quoteOutAddress = (tokenOut === "MST" ? CONTRACTS.wmst : outputToken.address) as Address;
        const amountRaw = parseUnits(amountIn, inputToken.decimals);

        if (!quoteInAddress || !quoteOutAddress) return;

        // Build list of candidate paths across all standard V3 fee tiers
        const feeTiers = [100, 500, 3000, 10000];
        const candidates: Array<{
          routeType: "single" | "multi";
          fee?: number;
          fees?: number[];
          path: Address;
          tokenIn: Address;
          tokenOut: Address;
          tokenMid?: Address;
        }> = [];

        // 1. Direct paths
        for (const fee of feeTiers) {
          candidates.push({
            routeType: "single",
            fee,
            path: encodePacked(["address", "uint24", "address"], [quoteInAddress, fee, quoteOutAddress]),
            tokenIn: quoteInAddress,
            tokenOut: quoteOutAddress
          });
        }

        // 2. Multi-hop paths (only if not swapping between the two base tokens directly)
        const baseTokens = [CONTRACTS.wmst, CONTRACTS.usdc].filter(Boolean) as Address[];
        const isDirectBaseSwap =
          baseTokens.some(b => b.toLowerCase() === quoteInAddress.toLowerCase()) &&
          baseTokens.some(b => b.toLowerCase() === quoteOutAddress.toLowerCase());

        if (!isDirectBaseSwap) {
          for (const baseToken of baseTokens) {
            if (
              baseToken.toLowerCase() !== quoteInAddress.toLowerCase() &&
              baseToken.toLowerCase() !== quoteOutAddress.toLowerCase()
            ) {
              for (const fee1 of feeTiers) {
                for (const fee2 of feeTiers) {
                  candidates.push({
                    routeType: "multi",
                    fees: [fee1, fee2],
                    path: encodePacked(
                      ["address", "uint24", "address", "uint24", "address"],
                      [quoteInAddress, fee1, baseToken, fee2, quoteOutAddress]
                    ),
                    tokenIn: quoteInAddress,
                    tokenMid: baseToken,
                    tokenOut: quoteOutAddress
                  });
                }
              }
            }
          }
        }

        // Query quotes for all candidates concurrently
        const quotes = await Promise.all(
          candidates.map(async (c) => {
            try {
              if (c.routeType === "single") {
                const { result } = await publicClient.simulateContract({
                  address: CONTRACTS.quoterV2,
                  abi: quoterV2Abi,
                  functionName: "quoteExactInputSingle",
                  args: [
                    {
                      tokenIn: c.tokenIn,
                      tokenOut: c.tokenOut,
                      amountIn: amountRaw,
                      fee: c.fee!,
                      sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
                    }
                  ]
                });
                return {
                  ...c,
                  outputAmount: result ? (result[0] as bigint) : 0n
                };
              } else {
                const { result } = await publicClient.simulateContract({
                  address: CONTRACTS.quoterV2,
                  abi: quoterV2Abi,
                  functionName: "quoteExactInput",
                  args: [c.path, amountRaw]
                });
                return {
                  ...c,
                  outputAmount: result ? (result[0] as bigint) : 0n
                };
              }
            } catch (err) {
              // Pool does not exist or has no liquidity
              return {
                ...c,
                outputAmount: 0n
              };
            }
          })
        );

        if (!active) return;

        // Find candidate with maximum outputAmount
        let best = quotes.reduce((max, current) => {
          return current.outputAmount > max.outputAmount ? current : max;
        }, { outputAmount: 0n } as typeof quotes[0] & { outputAmount: bigint });

        if (best.outputAmount > 0n) {
          setBestRoute({
            routeType: best.routeType,
            fee: best.fee,
            fees: best.fees,
            path: best.path,
            outputAmount: best.outputAmount,
            tokenMid: best.tokenMid
          });
          setQuotedOut(best.outputAmount);
          setAmountOut(formatUnits(best.outputAmount, outputToken.decimals));
        } else {
          setBestRoute(null);
          setQuotedOut(null);
          setAmountOut("");
        }
      } catch (err) {
        console.error("Error finding best route:", err);
        if (active) {
          setBestRoute(null);
          setQuotedOut(null);
          setAmountOut("");
        }
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [amountIn, isReadyAmount, tokenIn, tokenOut, inputToken, outputToken, chainId, liveMstPrice, useRouterApi, refreshTrigger]);

  const exchangeRateString = useMemo(() => {
    if (!amountIn || !amountOut || Number(amountIn) <= 0 || Number(amountOut) <= 0) {
      const priceIn = getTokenPrice(tokenIn);
      const priceOut = getTokenPrice(tokenOut);
      if (priceIn === 0 || priceOut === 0) return "";
      const rate = priceIn / priceOut;
      return `1 ${displayTokenSymbol(tokenIn)} = ${rate.toFixed(6).replace(/\.?0+$/, "")} ${displayTokenSymbol(tokenOut)}`;
    }
    const rate = Number(amountOut) / Number(amountIn);
    return `1 ${displayTokenSymbol(tokenIn)} = ${rate.toFixed(6).replace(/\.?0+$/, "")} ${displayTokenSymbol(tokenOut)}`;
  }, [tokenIn, tokenOut, amountIn, amountOut, liveMstPrice]);

  const feeDisplayString = useMemo(() => {
    if (!bestRoute) return "Fee: --";
    if (bestRoute.routeType === "wrap" || bestRoute.routeType === "unwrap") return "Fee: 0%";
    if (bestRoute.routeType === "single" && bestRoute.fee !== undefined) {
      return `Fee: ${(bestRoute.fee / 10000).toFixed(2)}%`;
    }
    if (bestRoute.routeType === "multi" && bestRoute.fees) {
      return `Route Fee: ${(bestRoute.fees[0] / 10000).toFixed(2)}% + ${(bestRoute.fees[1] / 10000).toFixed(2)}%`;
    }
    return "Fee: --";
  }, [bestRoute]);

  // Flip elements with advanced crossover transition
  const handleFlipTokens = () => {
    switchTokens();
  };

  // Spark physics confetti logic
  const triggerSuccessParticles = () => {
    const colors = ["#00F0FF", "#8A2BE2", "#FB118E", "#00FF66", "#FFDD00"];
    const newParticles: CustomParticle[] = [];

    // Emit 40 physics particles going in random outward velocities
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 4;
      newParticles.push({
        id: Date.now() + i + Math.random(),
        x: 0, // dynamic relative positioning
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // upwards gravity drift
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        alpha: 1,
      });
    }
    setParticles(newParticles);
  };

  // Physics animation loop for success particles
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // gravity pulling down
            alpha: p.alpha - 0.02,
          }))
          .filter((p) => p.alpha > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [particles]);

  // Token approval helper
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

  // Handle on-chain Swaps step-by-step
  const handleSwap = async () => {
    if (steps.length === 0) return;
    const activeStep = steps[0];

    if (!isConnected) {
      navigate("/wallet");
      return;
    }

    if (!(await ensureMstChain())) {
      return;
    }

    if (!address || !publicClient || !inputToken) {
      setStatusText("Wallet or token info is not loaded yet.");
      return;
    }

    setIsWorking(true);
    setTxHash("");
    setStatusText(activeStep.statusText);

    try {
      const amountRaw = parseUnits(amountIn, inputToken.decimals);

      if (activeStep.id === "wrap") {
        setStatusText("Confirming wrap deposit in wallet...");
        const hash = await writeContractAsync({
          address: CONTRACTS.wmst,
          abi: [
            {
              type: "function",
              name: "deposit",
              stateMutability: "payable",
              inputs: [],
              outputs: []
            }
          ] as const,
          functionName: "deposit",
          args: [],
          value: amountRaw
        });

        setTxHash(hash);
        setStatusText("Confirming Wrap on MST Blockchain...");
        await publicClient.waitForTransactionReceipt({ hash });
        setStatusText("Wrap confirmed!");

        // Direct MST -> WMST wrap completes here
        if (tokenIn === "MST" && tokenOut === "WMST") {
          triggerSuccessParticles();
          setToast({
            open: true,
            type: "success",
            title: "Wrap Confirmed!",
            description: `Successfully wrapped ${amountIn} MST to WMST.`,
            txHash: hash
          });
          setAmountIn("");
          setAmountOut("");
        } else {
          setToast({
            open: true,
            type: "success",
            title: "Wrap Successful",
            description: `Successfully wrapped ${amountIn} MST to WMST. Ready for next step.`,
            txHash: hash
          });
          setRefreshTrigger((prev) => prev + 1);
        }
      }

      else if (activeStep.id === "approve") {
        const approveAddress = (tokenIn === "MST" ? CONTRACTS.wmst : inputToken.address) as Address;
        const tokenSymbol = tokenIn === "MST" ? "WMST" : tokenIn;
        setStatusText(`Requesting ${tokenSymbol} approval in wallet...`);
        const hash = await writeContractAsync({
          address: approveAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.swapRouter, amountRaw]
        });

        setTxHash(hash);
        setStatusText(`Confirming ${tokenSymbol} approval on MST Blockchain...`);
        await publicClient.waitForTransactionReceipt({ hash });
        setStatusText("Approval confirmed!");
        setToast({
          open: true,
          type: "success",
          title: "Approval Successful",
          description: `Allowed SwapRouter to spend ${amountIn} ${tokenSymbol}. Ready for next step.`,
          txHash: hash
        });
        setRefreshTrigger((prev) => prev + 1);
      }

      else if (activeStep.id === "swap") {
        if (hasMissingTokenAddress) {
          setStatusText("Contract address missing in configs.");
          setIsWorking(false);
          return;
        }

        if (!bestRoute) {
          setStatusText("No route found.");
          setIsWorking(false);
          return;
        }

        setStatusText("Confirm swap transaction in wallet...");
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * deadlineMins);
        const estimatedOut = quotedOut || parseUnits(amountOut, outputToken?.decimals ?? 18);
        const amountOutMinimum = (estimatedOut * BigInt(10000 - slippageBps)) / 10000n;

        const swapInAddress = (tokenIn === "MST" ? CONTRACTS.wmst : inputToken?.address) as Address;
        const swapOutAddress = (tokenOut === "MST" ? CONTRACTS.wmst : outputToken?.address) as Address;

        let hash: Address;

        if (bestRoute.routeType === "single") {
          console.log("exactInputSingle swap execution:", {
            tokenIn: swapInAddress,
            tokenOut: swapOutAddress,
            fee: bestRoute.fee,
            amountIn: amountRaw.toString(),
            amountOutMinimum: amountOutMinimum.toString(),
            slippageBps,
            deadline: deadline.toString()
          });

          hash = await writeContractAsync({
            address: CONTRACTS.swapRouter,
            abi: swapRouterAbi,
            functionName: "exactInputSingle",
            args: [
              {
                tokenIn: swapInAddress,
                tokenOut: swapOutAddress,
                fee: bestRoute.fee!,
                recipient: address,
                deadline,
                amountIn: amountRaw,
                amountOutMinimum,
                sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
              }
            ],
            value: 0n
          });
        } else if (bestRoute.routeType === "multi") {
          console.log("exactInput multi-hop swap execution:", {
            path: bestRoute.path,
            tokenIn: swapInAddress,
            tokenOut: swapOutAddress,
            amountIn: amountRaw.toString(),
            amountOutMinimum: amountOutMinimum.toString(),
            slippageBps,
            deadline: deadline.toString()
          });

          hash = await writeContractAsync({
            address: CONTRACTS.swapRouter,
            abi: swapRouterAbi,
            functionName: "exactInput",
            args: [
              {
                path: bestRoute.path!,
                recipient: address,
                deadline,
                amountIn: amountRaw,
                amountOutMinimum
              }
            ],
            value: 0n
          });
        } else {
          setStatusText("Invalid route type.");
          setIsWorking(false);
          return;
        }

        setTxHash(hash);
        setStatusText("Submitting to MST Blockchain Node...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        let finalSwappedIn = amountIn;
        let finalSwappedOut = amountOut;

        // Log swap to backend database
        try {
          const hopsToLog: Array<{
            tokenIn: Address;
            tokenOut: Address;
            poolAddress: Address;
            estimatedIn: bigint;
            estimatedOut: bigint;
          }> = [];
          if (bestRoute.routeType === "single") {
            const poolAddress = await publicClient.readContract({
              address: CONTRACTS.factory,
              abi: rapidexV3FactoryAbi,
              functionName: "getPool",
              args: [swapInAddress, swapOutAddress, bestRoute.fee!]
            }) as Address;
            hopsToLog.push({
              tokenIn: swapInAddress,
              tokenOut: swapOutAddress,
              poolAddress,
              estimatedIn: amountRaw,
              estimatedOut: amountOutMinimum
            });
          } else if (bestRoute.routeType === "multi" && bestRoute.tokenMid) {
            const poolAddress1 = await publicClient.readContract({
              address: CONTRACTS.factory,
              abi: rapidexV3FactoryAbi,
              functionName: "getPool",
              args: [swapInAddress, bestRoute.tokenMid, bestRoute.fees![0]]
            }) as Address;
            const poolAddress2 = await publicClient.readContract({
              address: CONTRACTS.factory,
              abi: rapidexV3FactoryAbi,
              functionName: "getPool",
              args: [bestRoute.tokenMid, swapOutAddress, bestRoute.fees![1]]
            }) as Address;
            hopsToLog.push({
              tokenIn: swapInAddress,
              tokenOut: bestRoute.tokenMid,
              poolAddress: poolAddress1,
              estimatedIn: amountRaw,
              estimatedOut: 0n
            });
            hopsToLog.push({
              tokenIn: bestRoute.tokenMid,
              tokenOut: swapOutAddress,
              poolAddress: poolAddress2,
              estimatedIn: 0n,
              estimatedOut: amountOutMinimum
            });
          }

          let overallAmountInFormatted = amountIn;
          let overallAmountOutFormatted = amountOut;

          for (let i = 0; i < hopsToLog.length; i++) {
            const hop = hopsToLog[i];

            let rawAmountIn = 0n;
            let rawAmountOut = 0n;

            if (receipt && receipt.logs) {
              for (const log of receipt.logs) {
                if (log.address.toLowerCase() === hop.poolAddress.toLowerCase()) {
                  try {
                    const decoded = decodeEventLog({
                      abi: swapEventAbi,
                      data: log.data,
                      topics: log.topics
                    });
                    if (decoded.eventName === "Swap") {
                      const amt0 = BigInt(decoded.args.amount0.toString());
                      const amt1 = BigInt(decoded.args.amount1.toString());
                      const isWmstToken0 = hop.tokenIn.toLowerCase() < hop.tokenOut.toLowerCase();

                      if (isWmstToken0) {
                        rawAmountIn = amt0 > 0n ? amt0 : -amt0;
                        rawAmountOut = amt1 < 0n ? -amt1 : amt1;
                      } else {
                        rawAmountIn = amt1 > 0n ? amt1 : -amt1;
                        rawAmountOut = amt0 < 0n ? -amt0 : amt0;
                      }
                      break;
                    }
                  } catch (e) {
                    // Ignore decoding errors
                  }
                }
              }
            }

            const finalAmtIn = rawAmountIn > 0n ? rawAmountIn : hop.estimatedIn;
            const finalAmtOut = rawAmountOut > 0n ? rawAmountOut : hop.estimatedOut;

            const hopTokenIn = TOKENS.find(t => t.address?.toLowerCase() === hop.tokenIn.toLowerCase());
            const hopTokenOut = TOKENS.find(t => t.address?.toLowerCase() === hop.tokenOut.toLowerCase());
            const decIn = hopTokenIn?.decimals ?? 18;
            const decOut = hopTokenOut?.decimals ?? 18;

            const formattedIn = formatUnits(finalAmtIn, decIn);
            const formattedOut = formatUnits(finalAmtOut, decOut);

            if (i === 0) {
              overallAmountInFormatted = formattedIn;
            }
            if (i === hopsToLog.length - 1) {
              overallAmountOutFormatted = formattedOut;
            }

            const isWmstToken0 = hop.tokenIn.toLowerCase() < hop.tokenOut.toLowerCase();
            const amountInNum = Number(formattedIn);
            const amountOutNum = Number(formattedOut);
            const swapPrice = isWmstToken0
              ? (amountInNum > 0 ? amountOutNum / amountInNum : 0)
              : (amountOutNum > 0 ? amountInNum / amountOutNum : 0);

            console.log(`Recording hop ${i + 1} swap:`, {
              poolAddress: hop.poolAddress,
              tokenIn: hop.tokenIn,
              tokenOut: hop.tokenOut,
              amountIn: finalAmtIn.toString(),
              amountOut: finalAmtOut.toString(),
              price: swapPrice
            });

            await swapService.recordSwap({
              walletAddress: address!,
              poolAddress: hop.poolAddress,
              tokenIn: hop.tokenIn.toLowerCase(),
              tokenOut: hop.tokenOut.toLowerCase(),
              amountIn: finalAmtIn.toString(),
              amountOut: finalAmtOut.toString(),
              txHash: hash,
              chainId: chainId!,
              price: swapPrice,
            });
          }

          finalSwappedIn = overallAmountInFormatted;
          finalSwappedOut = overallAmountOutFormatted;
          setAmountOut(overallAmountOutFormatted);
        } catch (backendErr) {
          console.error("Failed to log swap to backend:", backendErr);
        }

        // If there is no unwrapping step next, complete the swap
        if (tokenOut !== "MST") {
          setStatusText("Swap confirmed!");
          triggerSuccessParticles();
          setToast({
            open: true,
            type: "success",
            title: "Swap Confirmed!",
            description: `Successfully swapped ${finalSwappedIn} ${tokenIn} for ${finalSwappedOut} ${tokenOut}.`,
            txHash: hash
          });
          setAmountIn("");
          setAmountOut("");
          setRefreshTrigger((prev) => prev + 1);
        } else {
          setStatusText("Swap successful! Unwrap required.");
          setToast({
            open: true,
            type: "success",
            title: "Swap Successful",
            description: `Swapped to WMST. Ready to unwrap back to native MST.`,
            txHash: hash
          });
          setRefreshTrigger((prev) => prev + 1);
        }
      }

      else if (activeStep.id === "unwrap") {
        setStatusText("Confirming unwrap withdrawal in wallet...");
        const estimatedOut = quotedOut || parseUnits(amountOut, outputToken?.decimals ?? 18);
        const hash = await writeContractAsync({
          address: CONTRACTS.wmst,
          abi: [
            {
              type: "function",
              name: "withdraw",
              stateMutability: "nonpayable",
              inputs: [{ name: "wad", type: "uint256" }],
              outputs: []
            }
          ] as const,
          functionName: "withdraw",
          args: [estimatedOut]
        });

        setTxHash(hash);
        setStatusText("Confirming Unwrap on MST Blockchain...");
        await publicClient.waitForTransactionReceipt({ hash });

        setStatusText("Swap confirmed!");
        triggerSuccessParticles();
        setToast({
          open: true,
          type: "success",
          title: "Swap Confirmed!",
          description: `Successfully unwrapped WMST to ${amountOut} MST.`,
          txHash: hash
        });
        setAmountIn("");
        setAmountOut("");
        setRefreshTrigger((prev) => prev + 1);
      }

      // Recheck steps to move to the next step
      await refreshSteps();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Swap failed.";
      const shortMsg = message.includes("reverted")
        ? "Swap reverted. Check liquidity pools."
        : message.substring(0, 80);

      setStatusText(shortMsg);
      setToast({
        open: true,
        type: "error",
        title: "Transaction Failed",
        description: shortMsg
      });
    } finally {
      setIsWorking(false);
    }
  };

  const isInsufficientBalance = useMemo(() => {
    if (!isConnected || !amountIn) return false;
    const amountNumber = Number(amountIn);
    const balanceNumber = Number(balanceIn);
    return Number.isFinite(amountNumber) && amountNumber > balanceNumber;
  }, [isConnected, amountIn, balanceIn]);

  const buttonLabel = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    if (chainId !== mstChain.id) return isSwitching ? "Switching Network..." : "Switch to MST Testnet";
    if (tokenIn === NATIVE_TOKEN_SYMBOL && tokenOut === "USDC") return "Swap Blocked";
    if (isWorking) return statusText || "Processing...";
    if (!amountIn || Number(amountIn) <= 0) return "Enter an amount";
    if (isInsufficientBalance) return `Insufficient ${displayTokenSymbol(tokenIn)} balance`;
    if (steps.length > 0) {
      return steps[0].label;
    }
    return "Confirm Swap";
  }, [isConnected, chainId, isWorking, statusText, amountIn, isSwitching, steps, tokenIn, tokenOut, isInsufficientBalance]);

  // Glow border tracking
  const handleInMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setInCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleOutMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOutCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative w-full max-w-[480px] mx-auto z-10 select-none">

      {/* 3D Spring Reveal Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.93, rotateX: 12 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{
          type: "spring",
          damping: 24,
          stiffness: 180,
          mass: 1.1,
        }}
        className={`p-6 rounded-[30px] border shadow-2xl relative backdrop-blur-2xl transition-colors duration-300 overflow-visible
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
        {/* Particle explosion elements inside widget bounds */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute left-1/2 top-[80%] rounded-full shadow-lg"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
                opacity: p.alpha,
                boxShadow: `0 0 10px ${p.color}`,
              }}
            />
          ))}
        </div>

        {/* Header bar */}
        <div className="flex items-center justify-between mb-5 relative">
          <div className="flex items-center gap-2">
            <span className={`font-bold text-2xl tracking-tight ${isDark ? "text-white" : "text-zinc-950"}`}>
              Swap
            </span>
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>

          <div className="flex items-center gap-3">
            {slippageBps !== 50 && (
              <span className="text-[11px] font-bold py-1 px-2.5 rounded-lg bg-pink-500/10 text-[#FB118E] font-mono">
                Slippage {(slippageBps / 100).toFixed(1)}%
              </span>
            )}

            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`p-2 rounded-xl transition-all duration-200 relative group
                ${isDark
                  ? "text-[#98A1C0] hover:text-white hover:bg-[#1B2236]/80"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
            >
              <Settings size={18} className="group-hover:rotate-45 transition-transform duration-300" />
            </button>

            <MstSwapSettings
              isOpen={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              slippage={slippageBps}
              setSlippage={(bps) => setSlippage(bps)}
              theme={theme}
            />
          </div>
        </div>

        {/* Animated Input crossover list */}
        <motion.div layout className="space-y-2 relative overflow-visible flex flex-col">
          {inputOrder.map((panelType) => {
            if (panelType === "in") {
              // Top panel: You pay
              return (
                <motion.div
                  key="panel-in"
                  layoutId="panel-in"
                  onMouseMove={handleInMouseMove}
                  onMouseEnter={() => setIsInHovered(true)}
                  onMouseLeave={() => setIsInHovered(false)}
                  className={`p-5 rounded-2xl transition-all duration-300 relative overflow-hidden border-none
                    ${isDark
                      ? "bg-[#141526]/10 focus-within:bg-white/5"
                      : "bg-zinc-50/40 focus-within:bg-zinc-50/10"
                    }`}
                >
                  {/* Dynamic mouse glow coordinates layer */}
                  {isDark && isInHovered && (
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(140px circle at ${inCoords.x}px ${inCoords.y}px, rgba(0, 240, 255, 0.08), transparent 80%)`
                      }}
                    />
                  )}

                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      You pay
                    </span>
                    {isConnected && (
                      <div className={`flex items-center gap-1 text-xs font-bold font-mono ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                        <span>Balance:</span>
                        <NumberTicker value={balanceIn} className={`font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={amountIn}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d*\.?\d*$/.test(val)) {
                          setAmountIn(val);
                        }
                      }}
                      disabled={isWorking}
                      className="w-full bg-transparent border-none outline-none font-bold text-3xl placeholder-zinc-600 max-w-[200px] truncate"
                    />

                    {/* Magnetic token selector pill */}
                    <button
                      ref={tokenInMagneticRef}
                      onClick={() => setModalOpen("in")}
                      className={`flex items-center gap-2 py-2.5 pl-3.5 pr-5 rounded-full shadow-lg border font-bold text-lg transition-colors duration-150 relative z-10
                        ${isDark
                          ? "bg-[#181930] border-zinc-800/80 hover:bg-zinc-800 text-white"
                          : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-950"
                        }`}
                    >
                      <TokenLogo symbol={tokenIn} size={26} />
                      <span>{displayTokenSymbol(tokenIn)}</span>
                      <ChevronDown size={15} className="opacity-60" />
                    </button>
                  </div>

                  {amountIn && (
                    <div className="text-xs mt-2 font-mono font-bold text-zinc-500">
                      ≈ {(Number(amountIn) * getTokenPrice(tokenIn)).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} USDC
                    </div>
                  )}
                </motion.div>
              );
            } else {
              // Bottom panel: You receive
              return (
                <motion.div
                  key="panel-out"
                  layoutId="panel-out"
                  onMouseMove={handleOutMouseMove}
                  onMouseEnter={() => setIsOutHovered(true)}
                  onMouseLeave={() => setIsOutHovered(false)}
                  className={`p-5 rounded-2xl transition-all duration-300 relative overflow-hidden border-none
                    ${isDark
                      ? "bg-[#141526]/10 focus-within:bg-white/5"
                      : "bg-zinc-50/40 focus-within:bg-zinc-50/10"
                    }`}
                >
                  {/* Dynamic mouse glow coordinates layer */}
                  {isDark && isOutHovered && (
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(140px circle at ${outCoords.x}px ${outCoords.y}px, rgba(138, 43, 226, 0.08), transparent 80%)`
                      }}
                    />
                  )}

                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      You receive
                    </span>
                    {isConnected && (
                      <div className={`flex items-center gap-1 text-xs font-bold font-mono ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                        <span>Balance:</span>
                        <NumberTicker value={balanceOut} className={`font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      readOnly
                      placeholder="0.0"
                      value={amountOut}
                      className="w-full bg-transparent border-none outline-none font-bold text-3xl placeholder-zinc-600 max-w-[200px] truncate"
                    />

                    {/* Magnetic token selector pill */}
                    <button
                      ref={tokenOutMagneticRef}
                      onClick={() => setModalOpen("out")}
                      className={`flex items-center gap-2 py-2.5 pl-3.5 pr-5 rounded-full shadow-lg border font-bold text-lg transition-colors duration-150 relative z-10
                        ${isDark
                          ? "bg-[#181930] border-zinc-800/80 hover:bg-zinc-800 text-white"
                          : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-950"
                        }`}
                    >
                      <TokenLogo symbol={tokenOut} size={26} />
                      <span>{displayTokenSymbol(tokenOut)}</span>
                      <ChevronDown size={15} className="opacity-60" />
                    </button>
                  </div>

                  {amountOut && (
                    <div className="text-xs mt-2 font-mono font-bold text-zinc-500">
                      ≈ {(Number(amountOut) * getTokenPrice(tokenOut)).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} USDC
                    </div>
                  )}
                </motion.div>
              );
            }
          })}

          {/* Central Reverse Arrow Button */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <button
              ref={arrowMagneticRef}
              onClick={handleFlipTokens}
              disabled={isWorking}
              className={`w-11 h-11 flex items-center justify-center rounded-2xl border shadow-xl transition-all duration-300 relative overflow-hidden group
                ${isDark
                  ? "bg-[#181930] border-zinc-800/80 hover:border-cyan-400 text-cyan-400 hover:text-white"
                  : "bg-white border-zinc-200 hover:border-cyan-400 text-zinc-600 hover:text-cyan-400"
                }`}
              style={{
                boxShadow: isDark
                  ? "0 4px 15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)"
                  : "0 4px 15px rgba(0,0,0,0.05)"
              }}
            >
              {/* Inner glowing hover layer */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <motion.div
                animate={{ rotate: arrowRotation }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 220
                }}
              >
                <ArrowDown size={16} />
              </motion.div>
            </button>
          </div>
        </motion.div>

        {/* Live Oracle Exchange Rates */}
        {amountIn && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-between px-1"
          >
            <span className={`text-xs font-bold font-mono ${isDark ? "text-zinc-400" : "text-zinc-500"} flex items-center gap-1.5`}>
              <Info size={12} className="opacity-70 text-cyan-400" />
              {exchangeRateString}
            </span>
            <button
              onClick={() => setRouteDetailsOpen(true)}
              disabled={!bestRoute || bestRoute.routeType === "wrap" || bestRoute.routeType === "unwrap"}
              className={`text-xs font-bold font-mono flex items-center gap-1 hover:underline transition-colors outline-none border-none bg-transparent cursor-pointer
                ${!bestRoute || bestRoute.routeType === "wrap" || bestRoute.routeType === "unwrap"
                  ? "text-zinc-500 cursor-default"
                  : isDark
                    ? "text-zinc-400 hover:text-cyan-400"
                    : "text-zinc-500 hover:text-cyan-600"
                }`}
            >
              <span>{feeDisplayString}</span>
              {bestRoute && bestRoute.routeType !== "wrap" && bestRoute.routeType !== "unwrap" && (
                <ChevronDown size={12} className="opacity-60" />
              )}
            </button>
          </motion.div>
        )}

        {/* Action Button: morphs to loading spinner during contract execution */}
        <button
          ref={buttonMagneticRef}
          onClick={handleSwap}
          disabled={isWorking || isSwitching || isInsufficientBalance || (isConnected && (!amountIn || Number(amountIn) <= 0 || steps.length === 0)) || (tokenIn === NATIVE_TOKEN_SYMBOL && tokenOut === "USDC")}
          className={`w-full mt-5 py-4.5 font-bold text-lg tracking-wider transition-all duration-300 relative overflow-hidden group border-none shadow-none bg-transparent select-none outline-none
            ${!isConnected
              ? "text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 active:scale-[0.98]"
              : (isWorking || isInsufficientBalance)
                ? "text-zinc-500 dark:text-zinc-600 cursor-not-allowed"
                : !amountIn || Number(amountIn) <= 0
                  ? "text-zinc-400 dark:text-zinc-700 cursor-not-allowed"
                  : (tokenIn === NATIVE_TOKEN_SYMBOL && tokenOut === "USDC")
                    ? "text-zinc-500 dark:text-zinc-600 cursor-not-allowed"
                    : "text-[#FB118E] hover:text-cyan-600 dark:hover:text-cyan-400 font-extrabold text-xl transition-all duration-300 active:scale-[0.98]"
            }`}
          style={{
            textShadow: (!isConnected || (!amountIn || Number(amountIn) <= 0) || isWorking || isInsufficientBalance || (tokenIn === NATIVE_TOKEN_SYMBOL && tokenOut === "USDC"))
              ? "none"
              : "0 0 10px rgba(251, 17, 142, 0.5), 0 0 20px rgba(0, 240, 255, 0.2)"
          }}
        >
          {/* Moving background cyber glint */}
          <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-shine" />

          {isWorking ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin h-5 w-5 text-cyan-400" />
              <span className="font-mono text-sm">{buttonLabel}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              {!amountIn || Number(amountIn) <= 0 || (tokenIn === NATIVE_TOKEN_SYMBOL && tokenOut === "USDC") ? null : <Sparkles size={16} className="text-cyan-300 group-hover:scale-125 transition-transform" />}
              <span>{buttonLabel}</span>
            </div>
          )}
        </button>

        {tokenIn === NATIVE_TOKEN_SYMBOL && tokenOut === "USDC" && (
          <div className="mt-3 text-center text-xs font-semibold text-rose-500">
            cannot swap from {displayTokenSymbol(tokenIn)} to {displayTokenSymbol(tokenOut)}
          </div>
        )}

      </motion.div>

      {/* Select Token Modal */}
      <MstTokenModal
        isOpen={modalOpen !== null}
        onClose={() => setModalOpen(null)}
        onSelect={(token) => {
          if (modalOpen === "in") {
            if (token === tokenOut) {
              setTokenOut(tokenIn);
            }
            setTokenIn(token);
          } else if (modalOpen === "out") {
            if (token === tokenIn) {
              setTokenIn(tokenOut);
            }
            setTokenOut(token);
          }
        }}
        selectedToken={modalOpen === "in" ? tokenIn : tokenOut}
        theme={theme}
      />

      {/* Route Details Modal */}
      <RouteDetailsModal
        isOpen={routeDetailsOpen}
        onClose={() => setRouteDetailsOpen(false)}
        bestRoute={bestRoute}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
        theme={theme}
      />

      {/* Premium custom top-right Toast notification (Tostify style) */}
      <AnimatePresence>
        {toast.open && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 200 }}
            className={`fixed top-24 right-6 z-[999] p-4 rounded-2xl shadow-2xl border w-full max-w-[360px] text-white backdrop-blur-md
              ${toast.type === "success"
                ? "bg-[#0c0c16]/95 border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.1)]"
                : "bg-[#180a0a]/95 border-rose-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(244,63,94,0.1)]"
              }`}
          >
            <div className="flex gap-3 relative">
              <div className={`p-2 rounded-xl self-start
                ${toast.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
              >
                {toast.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              </div>

              <div className="flex-1 pr-4">
                <h4 className="font-bold text-sm tracking-wide">
                  {toast.title}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {toast.description}
                </p>
                {toast.txHash && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <a
                      href={`https://testnet.mstscan.com/tx/${toast.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1"
                    >
                      <span>View on Explorer</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={() => setToast((prev) => ({ ...prev, open: false }))}
                className="absolute top-0 right-0 p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}