import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ChevronDown, ArrowDown, Info } from "lucide-react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract, useBalance } from "wagmi";
import { getToken, CONTRACTS, erc20Abi, quoterV2Abi, swapRouterAbi, V3_FEE, ZERO_SQRT_PRICE_LIMIT, API_BASE } from "../../config/contracts";
import { mstChain } from "../../config/chains";
import { useSwapStore } from "../../store/swapStore";
import { TokenLogo } from "./TokenLogos";
import { MstTokenModal } from "./MstTokenModal";
import { MstSwapSettings } from "./MstSwapSettings";

// Token price provider without static fallbacks


interface MstSwapCardProps {
  theme: "light" | "dark";
}

export const MstSwapCard: React.FC<MstSwapCardProps> = ({ theme }) => {
  // Real WAGMI account, chain, and client connections
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const navigate = useNavigate();

  // WAGMI native balance retrieval (fetches actual tMST testnet balances)
  const { data: nativeBalanceData, refetch: refetchNativeBalance } = useBalance({
    address: address,
  });

  // Sync token selection and inputs using global swapStore
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

  // Transaction States
  const [isWorking, setIsWorking] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [txHash, setTxHash] = useState("");
  const [quotedOut, setQuotedOut] = useState<bigint | null>(null);

  const isDark = theme === "dark";

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

  const getTokenPrice = (symbol: string) => {
    if (symbol === "USDC") return 1.0;
    if (symbol === "MST" || symbol === "WMST") return liveMstPrice;
    return 0.0;
  };

  const inputToken = useMemo(() => {
    if (tokenIn === "MST") {
      return {
        symbol: "MST",
        name: "MST Native Token",
        decimals: 18,
        address: undefined as any
      };
    }
    return getToken(tokenIn);
  }, [tokenIn]);

  const outputToken = useMemo(() => {
    if (tokenOut === "MST") {
      return {
        symbol: "MST",
        name: "MST Native Token",
        decimals: 18,
        address: undefined as any
      };
    }
    return getToken(tokenOut);
  }, [tokenOut]);

  const amountNumber = Number(amountIn);
  const hasMissingTokenAddress =
    (tokenIn !== "MST" && !inputToken?.address) ||
    (tokenOut !== "MST" && !outputToken?.address);
  const isReadyAmount = amountIn && Number.isFinite(amountNumber) && amountNumber > 0;

  // Sync active slippage basis points
  const handleSetSlippageBps = (bps: number) => {
    setSlippage(bps);
  };

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Fetch live balances (native tMST vs ERC20 tokens)
  const [balanceIn, setBalanceIn] = useState("0.00");
  useEffect(() => {
    let active = true;
    async function fetchBalance() {
      if (!isConnected || !address || !publicClient) return;

      // Case A: Fetch native MST (tMST) balance
      if (tokenIn === "MST") {
        if (active) {
          const res = await refetchNativeBalance();
          if (res.data) {
            setBalanceIn(Number(res.data.formatted).toFixed(4));
          }
        }
        return;
      }

      // Case B: Fetch ERC20 WMST/USDC contract balance
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

  // 2. Query Concentrated Quotes in real time
  useEffect(() => {
    if (!isReadyAmount || !publicClient || !inputToken || !outputToken) {
      setQuotedOut(null);
      setAmountOut("");
      return;
    }

    // Direct wrapping is 1:1, skip Quoter contract simulation
    if (
      (tokenIn === "MST" && tokenOut === "WMST") ||
      (tokenIn === "WMST" && tokenOut === "MST")
    ) {
      setAmountOut(amountIn);
      setQuotedOut(parseUnits(amountIn, outputToken?.decimals ?? 18));
      return;
    }

    let active = true;
    const delayDebounce = setTimeout(async () => {
      try {
        const quoteInAddress = (tokenIn === "MST" ? CONTRACTS.wmst : inputToken.address) as Address;
        const quoteOutAddress = (tokenOut === "MST" ? CONTRACTS.wmst : outputToken.address) as Address;
        const amountRaw = parseUnits(amountIn, inputToken.decimals);

        if (useRouterApi) {
          // Fetch quote dynamically from the backend order router
          const res = await fetch(`${API_BASE}/api/quote`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              tokenIn: quoteInAddress || tokenIn,
              tokenOut: quoteOutAddress || tokenOut,
              amountIn: amountRaw.toString()
            })
          });
          if (!res.ok) throw new Error("Backend SOR quote failed");
          const route = await res.json();
          if (active && route && route.amountOut) {
            const outRaw = BigInt(route.amountOut);
            setQuotedOut(outRaw);
            setAmountOut(formatUnits(outRaw, outputToken.decimals));
          }
        } else {
          // Query QuoterV2 directly via viem client simulation
          const { result } = await publicClient.simulateContract({
            address: CONTRACTS.quoterV2,
            abi: quoterV2Abi,
            functionName: "quoteExactInputSingle",
            args: [
              {
                tokenIn: quoteInAddress,
                tokenOut: quoteOutAddress,
                amountIn: amountRaw,
                fee: V3_FEE,
                sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
              }
            ]
          });

          if (active && result) {
            const outRaw = result[0];
            setQuotedOut(outRaw);
            setAmountOut(formatUnits(outRaw, outputToken.decimals));
          }
        }
      } catch (err) {
        if (active) {
          setAmountOut("");
          setQuotedOut(null);
        }
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [amountIn, isReadyAmount, tokenIn, tokenOut, inputToken, outputToken, chainId, liveMstPrice, useRouterApi]);

  const exchangeRateString = useMemo(() => {
    if (!amountIn || !amountOut || Number(amountIn) <= 0 || Number(amountOut) <= 0) {
      const priceIn = getTokenPrice(tokenIn);
      const priceOut = getTokenPrice(tokenOut);
      if (priceIn === 0 || priceOut === 0) return "";
      const rate = priceIn / priceOut;
      return `1 ${tokenIn} = ${rate.toFixed(6).replace(/\.?0+$/, "")} ${tokenOut}`;
    }
    const rate = Number(amountOut) / Number(amountIn);
    return `1 ${tokenIn} = ${rate.toFixed(6).replace(/\.?0+$/, "")} ${tokenOut}`;
  }, [tokenIn, tokenOut, amountIn, amountOut, liveMstPrice]);

  // Swapping inputs
  const handleFlipTokens = () => {
    switchTokens();
    setAmountIn(amountOut || "");
  };

  // Helper: Request token spending approvals
  async function approveTokenIfNeeded(tokenAddress: Address, amountRaw: bigint, symbol: string) {
    if (!publicClient || !address) return;

    setStatusText(`Checking ${symbol} allowance...`);
    const allowance = (await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, CONTRACTS.swapRouter]
    })) as bigint;

    if (allowance >= amountRaw) return;

    setStatusText(`[Step 2/3] Requesting ${symbol} approval in wallet...`);
    const approveHash = await writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.swapRouter, amountRaw]
    });

    setStatusText("[Step 2/3] Confirming approval on MST Blockchain...");
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
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

  // 3. Multi-Step On-Chain Transaction Router
  const handleSwap = async () => {
    if (!isConnected) {
      navigate("/wallet");
      return;
    }

    if (!(await ensureMstChain())) {
      return;
    }

    if (!address) {
      setStatusText("Wallet is not loaded yet.");
      return;
    }

    if (!isReadyAmount || !inputToken || !outputToken) {
      setStatusText("Enter a valid amount greater than zero.");
      return;
    }

    setIsWorking(true);
    setTxHash("");
    setStatusText("Preparing transactions...");

    try {
      const amountRaw = parseUnits(amountIn, inputToken.decimals);

      // ==========================================
      // FLOW 1: NATIVE WRAPPING (MST ⇄ WMST)
      // ==========================================
      if (tokenIn === "MST" && tokenOut === "WMST") {
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
        await publicClient?.waitForTransactionReceipt({ hash });
        setStatusText("Swap confirmed!");
        setAmountIn("");
        setAmountOut("");
        setRefreshTrigger(prev => prev + 1);
        return;
      }

      if (tokenIn === "WMST" && tokenOut === "MST") {
        setStatusText("Confirming unwrap withdrawal in wallet...");
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
          args: [amountRaw]
        });

        setTxHash(hash);
        setStatusText("Confirming Unwrap on MST Blockchain...");
        await publicClient?.waitForTransactionReceipt({ hash });
        setStatusText("Swap confirmed!");
        setAmountIn("");
        setAmountOut("");
        setRefreshTrigger(prev => prev + 1);
        return;
      }

      // ==========================================
      // FLOW 2: MULTI-STEP ROUTING (MST Native ⇄ USDC)
      // ==========================================
      if (tokenIn === "MST" && tokenOut === "USDC") {
        // Step 1: Wrap native MST to WMST
        setStatusText("[Step 1/3] Wrapping native MST to WMST...");
        const wrapHash = await writeContractAsync({
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
        setStatusText("[Step 1/3] Confirming Wrap on MST Blockchain...");
        await publicClient?.waitForTransactionReceipt({ hash: wrapHash });

        // Step 2: Approve spend for router
        await approveTokenIfNeeded(CONTRACTS.wmst, amountRaw, "WMST");

        // Step 3: Swap WMST for USDC
        setStatusText("[Step 3/3] Swapping WMST for USDC...");
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * deadlineMins);
        const estimatedOut = quotedOut || parseUnits(amountOut, outputToken.decimals);
        const amountOutMinimum = (estimatedOut * BigInt(10000 - slippageBps)) / 10000n;

        console.log("exactInputSingle (MST -> USDC):", {
          tokenIn: CONTRACTS.wmst,
          tokenOut: outputToken.address,
          amountIn: amountRaw.toString(),
          amountOutMinimum: amountOutMinimum.toString(),
          slippageBps,
          deadline: deadline.toString()
        });

        const hash = await writeContractAsync({
          address: CONTRACTS.swapRouter,
          abi: swapRouterAbi,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: CONTRACTS.wmst,
              tokenOut: outputToken.address as Address,
              fee: V3_FEE,
              recipient: address,
              deadline,
              amountIn: amountRaw,
              amountOutMinimum,
              sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
            }
          ],
          value: 0n
        });

        setTxHash(hash);
        setStatusText("[Step 3/3] Confirming swap on MST Blockchain...");
        await publicClient?.waitForTransactionReceipt({ hash });
        setStatusText("Swap confirmed!");
        setAmountIn("");
        setAmountOut("");
        setRefreshTrigger(prev => prev + 1);
        return;
      }

      if (tokenIn === "USDC" && tokenOut === "MST") {
        // Step 1: Approve spend for USDC
        await approveTokenIfNeeded(inputToken.address as Address, amountRaw, "USDC");

        // Step 2: Swap USDC to WMST
        setStatusText("[Step 2/3] Swapping USDC for WMST in wallet...");
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * deadlineMins);
        const estimatedOut = quotedOut || parseUnits(amountOut, outputToken?.decimals ?? 18);
        const amountOutMinimum = (estimatedOut * BigInt(10000 - slippageBps)) / 10000n;

        console.log("exactInputSingle (USDC -> MST):", {
          tokenIn: inputToken.address,
          tokenOut: CONTRACTS.wmst,
          amountIn: amountRaw.toString(),
          amountOutMinimum: amountOutMinimum.toString(),
          slippageBps,
          deadline: deadline.toString()
        });

        const swapHash = await writeContractAsync({
          address: CONTRACTS.swapRouter,
          abi: swapRouterAbi,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: inputToken.address as Address,
              tokenOut: CONTRACTS.wmst,
              fee: V3_FEE,
              recipient: address,
              deadline,
              amountIn: amountRaw,
              amountOutMinimum,
              sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
            }
          ],
          value: 0n
        });
        setStatusText("[Step 2/3] Confirming swap on MST Blockchain...");
        await publicClient?.waitForTransactionReceipt({ hash: swapHash });

        // Step 3: Unwrap WMST to Native MST
        setStatusText("[Step 3/3] Unwrapping WMST to native MST...");
        const unwrapHash = await writeContractAsync({
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

        setTxHash(unwrapHash);
        setStatusText("[Step 3/3] Confirming Unwrap on MST Blockchain...");
        await publicClient?.waitForTransactionReceipt({ hash: unwrapHash });
        setStatusText("Swap confirmed!");
        setAmountIn("");
        setAmountOut("");
        setRefreshTrigger(prev => prev + 1);
        return;
      }

      // ==========================================
      // FLOW 3: ERC20 TO ERC20 ROUTING (WMST ⇄ USDC)
      // ==========================================
      if (hasMissingTokenAddress) {
        setStatusText("Contract address missing in configs.");
        setIsWorking(false);
        return;
      }

      await approveTokenIfNeeded(inputToken.address as Address, amountRaw, inputToken.symbol);

      setStatusText("Confirm swap transaction in wallet...");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * deadlineMins);
      const estimatedOut = quotedOut || parseUnits(amountOut, outputToken.decimals);
      const amountOutMinimum = (estimatedOut * BigInt(10000 - slippageBps)) / 10000n;

      console.log("exactInputSingle (ERC20 -> ERC20):", {
        tokenIn: inputToken.address,
        tokenOut: outputToken.address,
        amountIn: amountRaw.toString(),
        amountOutMinimum: amountOutMinimum.toString(),
        slippageBps,
        deadline: deadline.toString()
      });

      const hash = await writeContractAsync({
        address: CONTRACTS.swapRouter,
        abi: swapRouterAbi,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: inputToken.address as Address,
            tokenOut: outputToken.address as Address,
            fee: V3_FEE,
            recipient: address,
            deadline,
            amountIn: amountRaw,
            amountOutMinimum,
            sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
          }
        ],
        value: 0n
      });

      setTxHash(hash);
      setStatusText("Submitting to MST Blockchain Node...");
      await publicClient?.waitForTransactionReceipt({ hash });

      setStatusText("Swap confirmed!");
      setAmountIn("");
      setAmountOut("");
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Swap failed.";
      setStatusText(
        message.includes("reverted")
          ? "Swap reverted. Check liquidity pools."
          : message.substring(0, 80)
      );
    } finally {
      setIsWorking(false);
    }
  };

  const buttonLabel = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    if (chainId !== mstChain.id) return isSwitching ? "Switching Network..." : "Switch to MST Testnet";
    if (isWorking) return statusText || "Processing...";
    if (!amountIn || Number(amountIn) <= 0) return "Enter an amount";
    return "Swap";
  }, [isConnected, chainId, isWorking, statusText, amountIn, isSwitching]);

  return (
    <div className="relative w-full max-w-[480px] mx-auto z-10 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className={`p-6 rounded-[24px] border shadow-xl relative
          ${isDark
            ? "bg-[#131A2A] border-[#2C364F]/50 text-white animate-pulse-slow"
            : "bg-white border-zinc-150 text-zinc-950"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative">
          <span className="font-semibold text-base">Swap</span>

          <div className="flex items-center gap-3">
            {slippageBps !== 50 && (
              <span className="text-[11px] font-bold py-1 px-2 rounded-lg bg-pink-500/10 text-[#FB118E]">
                Slippage {(slippageBps / 100).toFixed(1)}%
              </span>
            )}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`p-1.5 rounded-xl transition-colors duration-150 relative
                ${isDark
                  ? "text-[#98A1C0] hover:text-white hover:bg-[#1B2236]"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
            >
              <Settings size={18} />
            </button>

            {/* Settings cog */}
            <MstSwapSettings
              isOpen={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              slippage={slippageBps}
              setSlippage={handleSetSlippageBps}
              theme={theme}
            />
          </div>
        </div>

        {/* Input Areas */}
        <div className="space-y-1 relative">
          {/* Top Panel (You Pay) */}
          <div
            className={`p-4 rounded-[16px] border transition-all duration-150
              ${isDark
                ? "bg-[#1B2236] border-[#2C364F]/40 focus-within:border-[#2C364F]"
                : "bg-[#F5F6FC] border-transparent focus-within:border-zinc-200 focus-within:bg-[#EFF1FA]"
              }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                You pay
              </span>
              {isConnected && (
                <span className={`text-[11px] font-medium ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                  Balance: {balanceIn}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amountIn}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setAmountIn(val);
                  }
                }}
                disabled={isWorking}
                className="w-full bg-transparent border-none outline-none font-medium text-3xl placeholder-zinc-400 max-w-[240px] truncate"
              />

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setModalOpen("in")}
                className={`flex items-center gap-1.5 py-1.5 pl-2 pr-3.5 rounded-[20px] shadow-sm border font-bold text-base transition-colors duration-150
                  ${isDark
                    ? "bg-[#131A2A] border-[#2C364F] hover:bg-[#2C364F]/50 text-white"
                    : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-950"
                  }`}
              >
                <TokenLogo symbol={tokenIn} size={22} />
                <span>{tokenIn}</span>
                <ChevronDown size={14} className="opacity-60" />
              </motion.button>
            </div>

            {/* Price equivalences */}
            {amountIn && (
              <div className={`text-[11px] mt-1 font-semibold ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                {(Number(amountIn) * getTokenPrice(tokenIn)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </div>
            )}
          </div>

          {/* Swap Arrow */}
          <div className="absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 z-20">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFlipTokens}
              disabled={isWorking}
              className={`w-10 h-10 flex items-center justify-center rounded-[12px] border shadow-lg transition-colors duration-150
                ${isDark
                  ? "bg-[#1B2236] border-[#2C364F] hover:border-[#FB118E] text-[#98A1C0] hover:text-[#FB118E]"
                  : "bg-white border-zinc-150 hover:border-[#FB118E] text-zinc-500 hover:text-[#FB118E]"
                }`}
            >
              <ArrowDown size={16} />
            </motion.button>
          </div>

          {/* Bottom Panel (You Receive) */}
          <div
            className={`p-4 rounded-[16px] border transition-all duration-150
              ${isDark
                ? "bg-[#1B2236] border-[#2C364F]/40 focus-within:border-[#2C364F]"
                : "bg-[#F5F6FC] border-transparent focus-within:border-zinc-200 focus-within:bg-[#EFF1FA]"
              }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                You receive
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                readOnly
                placeholder="0"
                value={amountOut}
                className="w-full bg-transparent border-none outline-none font-medium text-3xl placeholder-zinc-400 max-w-[240px] truncate cursor-default text-zinc-700 dark:text-zinc-300"
              />

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setModalOpen("out")}
                className={`flex items-center gap-1.5 py-1.5 pl-2 pr-3.5 rounded-[20px] shadow-sm border font-bold text-base transition-colors duration-150
                  ${isDark
                    ? "bg-[#131A2A] border-[#2C364F] hover:bg-[#2C364F]/50 text-white"
                    : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-950"
                  }`}
              >
                <TokenLogo symbol={tokenOut} size={22} />
                <span>{tokenOut}</span>
                <ChevronDown size={14} className="opacity-60" />
              </motion.button>
            </div>

            {/* Price equivalences */}
            {amountOut && (
              <div className={`text-[11px] mt-1 font-semibold ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                {(Number(amountOut) * getTokenPrice(tokenOut)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </div>
            )}
          </div>
        </div>

        {/* Live Oracle Rate */}
        {amountIn && (
          <div className="mt-3 flex items-center justify-between px-1">
            <span className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"} flex items-center gap-1`}>
              <Info size={12} className="opacity-70" />
              {exchangeRateString}
            </span>
            <span className={`text-xs font-medium ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
              Concentrated Pool Fee: 0.3%
            </span>
          </div>
        )}

        {/* Action button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSwap}
          disabled={isWorking || isSwitching || (isConnected && (!amountIn || Number(amountIn) <= 0))}
          className={`w-full mt-4 py-4 rounded-[16px] font-bold text-base tracking-wide shadow-lg transition-all duration-200
            ${!isConnected
              ? "bg-[#FB118E]/10 hover:bg-[#FB118E]/20 text-[#FB118E]"
              : isWorking
                ? "bg-zinc-800 border-zinc-700 text-zinc-400 cursor-not-allowed"
                : !amountIn || Number(amountIn) <= 0
                  ? isDark
                    ? "bg-[#1B2236] text-[#98A1C0]/40 border-[#2C364F]/30 cursor-not-allowed border"
                    : "bg-[#F5F6FC] text-zinc-400 border-transparent cursor-not-allowed border"
                  : "bg-[#FB118E] hover:bg-[#FB118E]/95 text-white active:scale-[0.99] hover:shadow-[#FB118E]/20"
            }`}
        >
          {isWorking ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-[#FB118E]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{buttonLabel}</span>
            </div>
          ) : (
            <span>{buttonLabel}</span>
          )}
        </motion.button>

        {/* Transaction state feedback logs */}
        <AnimatePresence>
          {statusText && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <div
                className={`p-3 rounded-xl border text-xs font-semibold leading-relaxed
                  ${statusText === "Swap confirmed!"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse"
                    : "bg-[#1B2236] border-[#2C364F]/50 text-[#98A1C0]"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span>Status: {statusText}</span>
                  {statusText === "Swap confirmed!" && (
                    <button
                      onClick={() => setStatusText("")}
                      className="underline text-[10px] uppercase font-bold text-[#FB118E]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {txHash && (
                  <div className="mt-1 font-mono text-[10px] break-all opacity-70">
                    TX: <a href={`https://testnet.mstscan.com/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline hover:text-[#FB118E]">{txHash}</a>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
    </div>
  );
};
