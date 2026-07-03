import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { getToken, CONTRACTS, erc20Abi, quoterV2Abi, swapRouterAbi, V3_FEE, ZERO_SQRT_PRICE_LIMIT } from "../../config/contracts";
import { mstChain } from "../../config/chains";
import { useSwapStore } from "../../store/swapStore";
import TokenSearchModal from "./TokenSearchModal";

type SelectingSide = "in" | "out";

export default function SwapCard() {
  const { tokenIn, tokenOut, amountIn, slippageBps, setAmountIn, setTokenIn, setTokenOut, switchTokens } = useSwapStore();
  const [searchOpen, setSearchOpen] = useState<SelectingSide | null>(null);
  const [quotedOut, setQuotedOut] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const navigate = useNavigate();
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const inputToken = getToken(tokenIn);
  const outputToken = getToken(tokenOut);
  const amountNumber = Number(amountIn);
  const hasMissingTokenAddress = !inputToken?.address || !outputToken?.address;
  const isReadyAmount = amountIn && Number.isFinite(amountNumber) && amountNumber > 0;

  const formattedQuote = useMemo(() => {
    if (!quotedOut || !outputToken) return "0.0";
    return formatUnits(quotedOut, outputToken.decimals);
  }, [outputToken, quotedOut]);

  const buttonLabel = useMemo(() => {
    if (!isConnected) return "Connect wallet";
    if (chainId !== mstChain.id) return isSwitching ? "Switching..." : "Switch to MST Testnet";
    if (hasMissingTokenAddress) return "Token address missing";
    if (!isReadyAmount) return "Enter amount";
    return isWorking ? "Working..." : "Swap";
  }, [chainId, hasMissingTokenAddress, isConnected, isReadyAmount, isSwitching, isWorking]);

  function getAmountInRaw() {
    if (!inputToken) throw new Error("Select an input token.");
    return parseUnits(amountIn, inputToken.decimals);
  }

  async function quoteExactInput(amountRaw: bigint) {
    if (!publicClient || !inputToken?.address || !outputToken?.address) {
      throw new Error("Token or RPC configuration is missing.");
    }

    const { result } = await publicClient.simulateContract({
      address: CONTRACTS.quoterV2,
      abi: quoterV2Abi,
      functionName: "quoteExactInputSingle",
      args: [
        {
          tokenIn: inputToken.address,
          tokenOut: outputToken.address,
          amountIn: amountRaw,
          fee: V3_FEE,
          sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
        }
      ]
    });

    return result[0];
  }

  async function approveIfNeeded(amountRaw: bigint) {
    if (!publicClient || !address || !inputToken?.address) return;

    const allowance = await publicClient.readContract({
      address: inputToken.address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, CONTRACTS.swapRouter]
    });

    if (allowance >= amountRaw) return;

    setStatus(`Approving ${inputToken.symbol}...`);
    const approveHash = await writeContractAsync({
      address: inputToken.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.swapRouter, amountRaw]
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  async function ensureMstChain() {
    if (chainId === mstChain.id) return true;

    setStatus("Switch MetaMask to MST Testnet...");
    try {
      await switchChainAsync({ chainId: mstChain.id });
      return true;
    } catch {
      setStatus("Transaction blocked until MetaMask is on MST Testnet.");
      return false;
    }
  }

  async function handleSwap() {
    setStatus(null);
    setTxHash(null);
    setQuotedOut(null);

    if (!isConnected) {
      navigate("/wallet");
      return;
    }

    if (!(await ensureMstChain())) {
      return;
    }

    if (!address) {
      setStatus("Wallet address is not available yet.");
      return;
    }

    if (!inputToken?.address || !outputToken?.address) {
      setStatus(`Add real VITE_${tokenIn}_ADDRESS and VITE_${tokenOut}_ADDRESS values, then restart the frontend.`);
      return;
    }

    if (!isReadyAmount) {
      setStatus("Enter an amount greater than zero.");
      return;
    }

    setIsWorking(true);
    try {
      const amountRaw = getAmountInRaw();
      setStatus("Getting on-chain quote...");
      const amountOut = await quoteExactInput(amountRaw);
      setQuotedOut(amountOut);

      const amountOutMinimum = (amountOut * BigInt(10_000 - slippageBps)) / 10_000n;
      if (amountOutMinimum <= 0n) {
        throw new Error("Quoted output is too small after slippage.");
      }

      if (inputToken.isNativeWrapped) {
        setStatus("Wrapping MST to WMST...");
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
        setStatus("Waiting for wrap confirmation...");
        await publicClient?.waitForTransactionReceipt({ hash: wrapHash });
      }

      await approveIfNeeded(amountRaw);

      setStatus("Confirm swap in MetaMask...");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
      const hash = await writeContractAsync({
        address: CONTRACTS.swapRouter,
        abi: swapRouterAbi,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: inputToken.address,
            tokenOut: outputToken.address,
            fee: V3_FEE,
            recipient: address as Address,
            deadline,
            amountIn: amountRaw,
            amountOutMinimum,
            sqrtPriceLimitX96: ZERO_SQRT_PRICE_LIMIT
          }
        ],
        value: 0n
      });

      setTxHash(hash);
      setStatus("Waiting for confirmation...");
      await publicClient?.waitForTransactionReceipt({ hash });
      setStatus("Swap confirmed.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Swap failed.";
      setStatus(message.includes("reverted") ? "Swap reverted. Check that the pool exists and has liquidity." : message);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl bg-zinc-900">
      <h2 className="text-xl font-semibold mb-4">Swap</h2>

      <div className="rounded-xl bg-zinc-800 p-4 mb-2">
        <input
          id="swap-amount-in"
          name="amountIn"
          inputMode="decimal"
          autoComplete="off"
          className="bg-transparent w-full text-2xl outline-none"
          placeholder="0.0"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
        />
        <button onClick={() => setSearchOpen("in")}>{tokenIn}</button>
      </div>

      <button className="mx-auto my-2 block rounded-lg bg-zinc-800 px-3 py-1 text-sm" onClick={switchTokens}>
        Switch
      </button>

      <div className="rounded-xl bg-zinc-800 p-4">
        <div className="text-2xl text-zinc-400">{formattedQuote}</div>
        <button onClick={() => setSearchOpen("out")}>{tokenOut}</button>
      </div>

      {slippageBps > 300 && (
        <p className="text-amber-400 mt-2 text-sm">
          High slippage tolerance ({(slippageBps / 100).toFixed(2)}%) - your trade may be front-run.
        </p>
      )}

      {status && <p className="mt-3 text-sm text-zinc-300">{status}</p>}
      {txHash && <p className="mt-2 break-all text-xs text-zinc-500">Tx: {txHash}</p>}

      <button
        className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isWorking || isSwitching || hasMissingTokenAddress}
        onClick={handleSwap}
      >
        {buttonLabel}
      </button>

      {hasMissingTokenAddress && (
        <p className="mt-3 text-sm text-amber-300">
          Configure real token addresses in frontend env, then create/fund the V3 pool on MST Testnet.
        </p>
      )}

      {searchOpen && (
        <TokenSearchModal
          onClose={() => setSearchOpen(null)}
          onSelect={(symbol) => (searchOpen === "in" ? setTokenIn(symbol) : setTokenOut(symbol))}
        />
      )}
    </div>
  );
}