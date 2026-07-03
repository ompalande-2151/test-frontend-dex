import { formatUnits, parseUnits, type Address, type PublicClient } from "viem";
import { TOKENS, tokensForChain, type Token } from "@/config/tokens";
import type {
  Portfolio,
  PortfolioActivity,
  PortfolioActivityType,
  PortfolioAsset,
  PortfolioChartPoint,
  PortfolioPosition,
} from "../types";
import { SUPPORTED_CHAINS } from "@/config/wagmi";
import { getContractAddress, ABIS, erc20Abi, nonfungiblePositionManagerAbi, erc20TransferEvent, erc20ApprovalEvent, erc721TransferEvent, V3_FEE, ZERO_SQRT_PRICE_LIMIT } from "@/config";
import { MOCK_ACTIVITY, MOCK_POSITIONS } from "../mock/portfolio.mock";

const txCache = new Map<string, any>();
const blockCache = new Map<bigint, any>();
const tokenMetaCache = new Map<string, { symbol: string; decimals: number }>();

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

async function getTokenMeta(publicClient: PublicClient, addr: string): Promise<{ symbol: string; decimals: number }> {
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
      publicClient.readContract({
        address: addr as Address,
        abi: ABIS.erc20,
        functionName: "symbol"
      }),
      publicClient.readContract({
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

function getSqrtRatioAtTick(tick: number): number {
  return Math.pow(1.0001, tick / 2);
}

function getAmountsForLiquidity(
  sqrtPriceX96: bigint,
  tick: number,
  tickLower: number,
  tickUpper: number,
  liquidity: bigint
) {
  const sqrtP = Number(sqrtPriceX96) / Math.pow(2, 96);
  const sqrtPLower = getSqrtRatioAtTick(tickLower);
  const sqrtPUpper = getSqrtRatioAtTick(tickUpper);
  const L = Number(liquidity);

  let amount0 = 0;
  let amount1 = 0;

  if (tick < tickLower) {
    amount0 = L * (1 / sqrtPLower - 1 / sqrtPUpper);
    amount1 = 0;
  } else if (tick < tickUpper) {
    amount0 = L * (1 / sqrtP - 1 / sqrtPUpper);
    amount1 = L * (sqrtP - sqrtPLower);
  } else {
    amount0 = 0;
    amount1 = L * (sqrtPUpper - sqrtPLower);
  }

  return { amount0, amount1 };
}

const CHAIN_NATIVE_SYMBOL: Record<number, string> = {
  1: "ETH",
  8453: "ETH",
  42161: "ETH",
  10: "ETH",
  137: "MATIC",
  91562037: "MST",
};

function tokenPrice(symbol: string) {
  const token = TOKENS.find((entry) => entry.symbol === symbol);
  return token?.priceUsd ?? 0;
}

function fallbackMstPrice() {
  const token = TOKENS.find((entry) => entry.symbol === "WMST" || entry.symbol === "MST");
  return token?.priceUsd || 1.85;
}

function chainLabel(chainId: number) {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId)?.name ?? "Network";
}

function nativeTokenForChain(chainId: number): Token | null {
  const targetChainId = CHAIN_NATIVE_SYMBOL[chainId] ? chainId : 91562037;
  const symbol = CHAIN_NATIVE_SYMBOL[targetChainId] ?? "MST";
  return TOKENS.find((token) => token.symbol === symbol) ?? null;
}

function safeNumber(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals));
}

export interface WalletPortfolioSnapshot {
  portfolio: Portfolio;
  assets: PortfolioAsset[];
  activity: PortfolioActivity[];
  positions: PortfolioPosition[];
  chartPoint: PortfolioChartPoint;
  balanceHistory?: Array<{ timestamp: number; balances: Record<string, number> }>;
}

export async function getWalletPortfolioSnapshot({
  address,
  chainId,
  publicClient,
}: {
  address: Address;
  chainId: number;
  publicClient: PublicClient;
}): Promise<WalletPortfolioSnapshot> {
  const targetChainId = CHAIN_NATIVE_SYMBOL[chainId] ? chainId : 91562037;
  // Fetch live MST price from pool slot0 primarily, fallback to quoter simulation
  let liveMstPrice = 0;
  let poolSqrtPriceX96 = 0n;
  let poolTick = 0;
  try {
    const lpStateStorage = getContractAddress("lpStateStorage", targetChainId);
    const poolAddress = lpStateStorage ?
      (await publicClient.readContract({
        address: lpStateStorage,
        abi: ABIS.lpStateStorage,
        functionName: "poolAddress"
      }).catch(() => null)) : null;

    const targetPool = poolAddress || getContractAddress("pool", targetChainId);
    if (targetPool) {
      const slot0 = await publicClient.readContract({
        address: targetPool as Address,
        abi: ABIS.pool,
        functionName: "slot0"
      });

      if (slot0 && slot0[0] > 0n) {
        poolSqrtPriceX96 = BigInt(slot0[0]);
        poolTick = Number(slot0[1]);
        const Q96 = 2n ** 96n;
        const priceOfUsdcInWmst = (Number(poolSqrtPriceX96) / Number(Q96)) ** 2;
        if (priceOfUsdcInWmst > 0) {
          liveMstPrice = 1 / priceOfUsdcInWmst;
        }
      }
    }
  } catch (err) {
    console.error("Error reading spot price from pool slot0 in portfolio service", err);
  }

  // Fallback to QuoterV2 if slot0 fails or returns 0
  if (liveMstPrice <= 0) {
    try {
      const wmstAddress = getContractAddress("wmst", targetChainId);
      const usdcAddress = getContractAddress("usdc", targetChainId);
      const wmstToken = TOKENS.find((t) => t.symbol === "WMST");
      const usdcToken = TOKENS.find((t) => t.symbol === "USDC");
      const wmstDecimals = wmstToken?.decimals ?? 18;
      const usdcDecimals = usdcToken?.decimals ?? 18;

      if (wmstAddress && usdcAddress) {
        const oneUnitRaw = parseUnits("1", wmstDecimals);
        const { result } = await publicClient.simulateContract({
          address: getContractAddress("quoterV2", targetChainId),
          abi: ABIS.quoterV2,
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

        if (result) {
          liveMstPrice = Number(formatUnits(result[0], usdcDecimals));
        }
      }
    } catch (err) {
      console.error("Error fetching live MST price via quoter in portfolio service", err);
    }
  }

  if (liveMstPrice <= 0) {
    liveMstPrice = fallbackMstPrice();
  }

  if (poolSqrtPriceX96 === 0n) {
    try {
      const priceOfUsdcInWmst = 1 / liveMstPrice;
      const sqrtP = Math.sqrt(priceOfUsdcInWmst);
      poolSqrtPriceX96 = BigInt(Math.floor(sqrtP * Math.pow(2, 96)));
      poolTick = Math.floor(Math.log(priceOfUsdcInWmst) / Math.log(1.0001));
    } catch (err) {
      console.error("Error calculating pool math fallback:", err);
    }
  }

  const portfolioTokens = tokensForChain(targetChainId);
  const [nativeBalance, tokenBalances, userPositionsData] = await Promise.all([
    publicClient.getBalance({ address }).catch((err) => {
      console.error("Error reading native balance in portfolio service:", err);
      return 0n;
    }),
    Promise.all(
      portfolioTokens.map(async (token) => {
        try {
          const balance = await publicClient.readContract({
            abi: ABIS.erc20,
            address: token.address as Address,
            functionName: "balanceOf",
            args: [address],
          });
          return { result: balance };
        } catch (err) {
          console.error(`Error reading balance for ${token.symbol}`, err);
          return { result: 0n };
        }
      })
    ),
    (async () => {
      try {
        const positionManager = getContractAddress("positionManager", targetChainId);
        const npmBalance = (await publicClient.readContract({
          address: positionManager,
          abi: ABIS.positionManager,
          functionName: "balanceOf",
          args: [address]
        }).catch(() => 0n)) as bigint;

        const ownedTokenIds: string[] = [];
        if (npmBalance > 0n) {
          const indices = Array.from({ length: Number(npmBalance) }, (_, i) => i);
          const fetchedIds = await mapWithLimit(
            indices,
            3,
            async (i) => {
              try {
                const tokenId = await publicClient.readContract({
                  address: positionManager,
                  abi: ABIS.positionManager,
                  functionName: "tokenOfOwnerByIndex",
                  args: [address, BigInt(i)]
                }) as bigint;
                return tokenId.toString();
              } catch (err) {
                console.error(`Error reading tokenOfOwnerByIndex at index ${i}:`, err);
                return null;
              }
            }
          );
          fetchedIds.forEach((id) => {
            if (id !== null) {
              ownedTokenIds.push(id);
            }
          });
        }

        const positionDetails = await mapWithLimit(
          ownedTokenIds,
          3,
          async (tokenIdStr) => {
            try {
              const tokenId = BigInt(tokenIdStr);
              const pos = await publicClient.readContract({
                address: positionManager,
                abi: ABIS.positionManager,
                functionName: "positions",
                args: [tokenId]
              });
              return { tokenIdStr, pos };
            } catch (err) {
              console.error(`Error reading position detail for tokenId ${tokenIdStr}:`, err);
              return null;
            }
          }
        );

        return positionDetails.filter((p): p is { tokenIdStr: string; pos: any } => {
          if (!p) return false;
          return !!p.pos;
        });
      } catch (err) {
        console.error("Error fetching user LP positions in portfolio service:", err);
        return [];
      }
    })()
  ]);

  const nativeToken = nativeTokenForChain(targetChainId);
  const nativeAmount = nativeToken ? safeNumber(nativeBalance, nativeToken.decimals) : 0;
  const nativePrice = nativeToken ? (nativeToken.symbol === "MST" ? liveMstPrice : nativeToken.priceUsd ?? 0) : 0;
  const nativeValueUsd = nativeToken ? nativeAmount * nativePrice : 0;

  const wmstToken = portfolioTokens.find((t) => t.symbol === "WMST");
  const wmstBalanceIndex = portfolioTokens.findIndex((t) => t.symbol === "WMST");
  const wmstRaw = wmstBalanceIndex >= 0 ? (tokenBalances[wmstBalanceIndex] as { result?: unknown } | undefined) : undefined;
  const wmstBalanceRaw = typeof wmstRaw?.result === "bigint" ? wmstRaw.result : 0n;
  const wmstAmount = wmstToken ? safeNumber(wmstBalanceRaw, wmstToken.decimals) : 0;

  const usdcToken = portfolioTokens.find((t) => t.symbol === "USDC");
  const usdcBalanceIndex = portfolioTokens.findIndex((t) => t.symbol === "USDC");
  const usdcRaw = usdcBalanceIndex >= 0 ? (tokenBalances[usdcBalanceIndex] as { result?: unknown } | undefined) : undefined;
  const usdcBalanceRaw = typeof usdcRaw?.result === "bigint" ? usdcRaw.result : 0n;
  const usdcAmount = usdcToken ? safeNumber(usdcBalanceRaw, usdcToken.decimals) : 0;

  const assets: PortfolioAsset[] = [];

  if (nativeToken) {
    assets.push({
      id: `native-${targetChainId}`,
      symbol: nativeToken.symbol,
      name: nativeToken.name,
      network: chainLabel(targetChainId),
      chainId: targetChainId,
      priceUsd: nativePrice,
      balance: nativeAmount,
      valueUsd: nativeValueUsd,
      change24h: 0,
      allocation: 0,
      address: nativeToken.address ?? "",
    });
  }

  portfolioTokens.forEach((token, index) => {
    const raw = tokenBalances[index] as { result?: unknown } | undefined;
    const balance = typeof raw?.result === "bigint" ? raw.result : 0n;

    const tokenPriceValue = token.symbol === "USDC" ? 1.0 : (token.symbol === "WMST" ? liveMstPrice : token.priceUsd ?? 0);
    const amount = safeNumber(balance, token.decimals);
    const valueUsd = amount * tokenPriceValue;

    assets.push({
      id: token.symbol.toLowerCase(),
      symbol: token.symbol,
      name: token.name,
      network: chainLabel(targetChainId),
      chainId: targetChainId,
      priceUsd: tokenPriceValue,
      balance: amount,
      valueUsd,
      change24h: 0,
      allocation: 0,
      address: token.address ?? "",
    });
  });

  const positions: PortfolioPosition[] = [];

  const wmstAddress = getContractAddress("wmst", targetChainId).toLowerCase();
  const usdcAddress = getContractAddress("usdc", targetChainId).toLowerCase();

  await Promise.all(userPositionsData.map(async ({ tokenIdStr, pos }) => {
    const token0 = pos[2] as string;
    const token1 = pos[3] as string;
    const fee = Number(pos[4]);
    const tickLower = Number(pos[5]);
    const tickUpper = Number(pos[6]);
    const liquidity = BigInt(pos[7]);

    const { amount0, amount1 } = getAmountsForLiquidity(
      poolSqrtPriceX96,
      poolTick,
      tickLower,
      tickUpper,
      liquidity
    );

    const isWmstUsdcPair = (
      (token0.toLowerCase() === usdcAddress && token1.toLowerCase() === wmstAddress) ||
      (token0.toLowerCase() === wmstAddress && token1.toLowerCase() === usdcAddress)
    );

    const [token0Meta, token1Meta] = await Promise.all([
      getTokenMeta(publicClient, token0),
      getTokenMeta(publicClient, token1)
    ]);

    const amount0Readable = amount0 / Math.pow(10, token0Meta.decimals);
    const amount1Readable = amount1 / Math.pow(10, token1Meta.decimals);

    let lpLiquidityUsd = 0;
    if (isWmstUsdcPair) {
      const wmstReserve = token0Meta.symbol === "WMST" ? amount0Readable : amount1Readable;
      const usdcReserve = token0Meta.symbol === "USDC" ? amount0Readable : amount1Readable;
      lpLiquidityUsd = wmstReserve * liveMstPrice + usdcReserve;
    }

    positions.push({
      id: `lp-pos-${tokenIdStr}`,
      pool: `${token0Meta.symbol} / ${token1Meta.symbol} ${(fee / 10000).toFixed(2)}%`,
      assets: [token0Meta.symbol, token1Meta.symbol],
      network: chainLabel(targetChainId),
      liquidityUsd: lpLiquidityUsd,
      apr: 12.4,
      feesEarnedUsd: 0,
      status: liquidity === 0n ? "Closed" : ((poolTick >= tickLower && poolTick <= tickUpper) ? "In Range" : "Out Of Range"),
      hash: `0xpos-${tokenIdStr}`,
      reserves: {
        [token0Meta.symbol]: amount0Readable,
        [token1Meta.symbol]: amount1Readable
      }
    });
  }));

  const assetsValueUsd = assets.reduce((sum, asset) => sum + asset.valueUsd, 0);
  const positionsValueUsd = positions.reduce((sum, pos) => sum + pos.liquidityUsd, 0);
  const totalValueUsd = assetsValueUsd + positionsValueUsd;

  const sortedAssets = [...assets].sort((a, b) => b.valueUsd - a.valueUsd);

  const withAllocation = sortedAssets.map((asset) => ({
    ...asset,
    allocation: assetsValueUsd > 0 ? (asset.valueUsd / assetsValueUsd) * 100 : 0,
  }));

  const largestHolding = withAllocation[0];

  const parsedActivities: PortfolioActivity[] = [];
  const balanceHistory: Array<{ timestamp: number; balances: Record<string, number> }> = [];

  const getTokenPrice = (symbol: string) => {
    if (symbol === "USDC") return 1.0;
    if (symbol === "WMST" || symbol === "MST") return liveMstPrice;
    const existing = TOKENS.find(t => t.symbol === symbol);
    return existing?.priceUsd ?? 0;
  };

  try {
    const fromBlock = 2200000n;

    const [sentLogs, receivedLogs, approvalLogs] = await Promise.all([
      publicClient.getLogs({
        event: erc20TransferEvent,
        args: {
          from: address
        },
        fromBlock,
        toBlock: "latest"
      }).catch((err) => {
        console.error("Error fetching sent logs in service:", err);
        return [];
      }),
      publicClient.getLogs({
        event: erc20TransferEvent,
        args: {
          to: address
        },
        fromBlock,
        toBlock: "latest"
      }).catch((err) => {
        console.error("Error fetching received logs in service:", err);
        return [];
      }),
      publicClient.getLogs({
        event: erc20ApprovalEvent,
        args: {
          owner: address
        },
        fromBlock,
        toBlock: "latest"
      }).catch((err) => {
        console.error("Error fetching approval logs in service:", err);
        return [];
      })
    ]);

    console.log("Activity logs fetched count:", { sent: sentLogs.length, received: receivedLogs.length, approvals: approvalLogs.length });

    const logsByHash: Record<string, any[]> = {};
    for (const log of [...sentLogs, ...receivedLogs, ...approvalLogs]) {
      if (!log.transactionHash) continue;
      if (!logsByHash[log.transactionHash]) {
        logsByHash[log.transactionHash] = [];
      }
      if (!logsByHash[log.transactionHash].some(l => l.logIndex === log.logIndex)) {
        logsByHash[log.transactionHash].push(log);
      }
    }

    const tokenByAddress = (addr: string) => {
      return TOKENS.find(t => t.address?.toLowerCase() === addr.toLowerCase());
    };

    const logsList = Object.entries(logsByHash).map(([hash, logs]) => {
      const minBlock = Math.min(...logs.map(l => Number(l.blockNumber || 0)));
      return { hash, logs, minBlock };
    }).sort((a, b) => b.minBlock - a.minBlock);

    const latestTxHashes = logsList.slice(0, 10);

    const parsedActivitiesRaw = await mapWithLimit(
      latestTxHashes,
      3,
      async ({ hash, logs: txLogs }) => {
        try {
          const sends = txLogs.filter(l => l.eventName === "Transfer" && l.args && (l.args as any).from?.toLowerCase() === address.toLowerCase());
          const receives = txLogs.filter(l => l.eventName === "Transfer" && l.args && (l.args as any).to?.toLowerCase() === address.toLowerCase());
          const approvals = txLogs.filter(l => l.eventName === "Approval" && l.args && (l.args as any).owner?.toLowerCase() === address.toLowerCase());

          let type: PortfolioActivityType = "send";
          let assetLabel = "";
          let amount = 0;
          let amountUsd = 0;

          if (approvals.length > 0) {
            type = "approve";
            const token = await getTokenMeta(publicClient, approvals[0].address);
            assetLabel = token.symbol;
            amount = Number(formatUnits((approvals[0].args as any).value || 0n, token.decimals));
            amountUsd = 0;
          } else {
            // Check for Wrap/Unwrap (Transfer to/from zero address) on WMST contract
            const wrapLog = receives.find(r => r.args && (r.args as any).from === '0x0000000000000000000000000000000000000000');
            const unwrapLog = sends.find(s => s.args && (s.args as any).to === '0x0000000000000000000000000000000000000000');

            const wmstToken = TOKENS.find((t) => t.symbol === "WMST");
            const wmstDecimals = wmstToken?.decimals ?? 18;

            if (wrapLog && wrapLog.address.toLowerCase() === getContractAddress("wmst", targetChainId).toLowerCase()) {
              type = "swap";
              assetLabel = "MST → WMST";
              amount = Number(formatUnits((wrapLog.args as any).value || 0n, wmstDecimals));
              amountUsd = amount * liveMstPrice;
            } else if (unwrapLog && unwrapLog.address.toLowerCase() === getContractAddress("wmst", targetChainId).toLowerCase()) {
              type = "swap";
              assetLabel = "WMST → MST";
              amount = Number(formatUnits((unwrapLog.args as any).value || 0n, wmstDecimals));
              amountUsd = amount * liveMstPrice;
            } else {
              let txObj = txCache.get(hash);
              if (!txObj) {
                txObj = await publicClient.getTransaction({ hash: hash as Address }).catch(() => null);
                if (txObj) txCache.set(hash, txObj);
              }
              const nativeValueSent = txObj && txObj.from.toLowerCase() === address.toLowerCase() ? Number(formatUnits(txObj.value, 18)) : 0;

              const toAddress = txObj?.to?.toLowerCase();
              const isLiquidityTx = txObj && toAddress && (
                toAddress === getContractAddress("lpStateStorage", targetChainId).toLowerCase() ||
                toAddress === getContractAddress("positionManager", targetChainId).toLowerCase()
              );

              if (isLiquidityTx) {
                type = "liquidity";
                if (sends.length > 0) {
                  const parts = await Promise.all(sends.map(async s => (await getTokenMeta(publicClient, s.address)).symbol));
                  assetLabel = parts.filter(Boolean).join(" + ") || "LP Deposit";

                  let totalSendUsd = 0;
                  for (const s of sends) {
                    const token = await getTokenMeta(publicClient, s.address);
                    if (s.args) {
                      const amt = Number(formatUnits((s.args as any).value || 0n, token.decimals));
                      const price = getTokenPrice(token.symbol);
                      totalSendUsd += amt * price;
                    }
                  }
                  const singleToken = await getTokenMeta(publicClient, sends[0].address);
                  amount = sends.length === 1
                    ? Number(formatUnits((sends[0].args as any).value || 0n, singleToken.decimals))
                    : 0;
                  amountUsd = totalSendUsd;
                } else if (receives.length > 0) {
                  const parts = await Promise.all(receives.map(async r => (await getTokenMeta(publicClient, r.address)).symbol));
                  assetLabel = parts.filter(Boolean).join(" + ") || "LP Withdrawal";

                  let totalReceiveUsd = 0;
                  for (const r of receives) {
                    const token = await getTokenMeta(publicClient, r.address);
                    if (r.args) {
                      const amt = Number(formatUnits((r.args as any).value || 0n, token.decimals));
                      const price = getTokenPrice(token.symbol);
                      totalReceiveUsd += amt * price;
                    }
                  }
                  const singleToken = await getTokenMeta(publicClient, receives[0].address);
                  amount = receives.length === 1
                    ? Number(formatUnits((receives[0].args as any).value || 0n, singleToken.decimals))
                    : 0;
                  amountUsd = totalReceiveUsd;
                } else {
                  assetLabel = "LP Interaction";
                  amount = 0;
                  amountUsd = 0;
                }
              } else if (sends.length > 0 && receives.length > 0) {
                type = "swap";
                const sendToken = await getTokenMeta(publicClient, sends[0].address);
                const receiveToken = await getTokenMeta(publicClient, receives[0].address);

                if (sendToken && receiveToken) {
                  assetLabel = `${sendToken.symbol} → ${receiveToken.symbol}`;
                  amount = Number(formatUnits((receives[0].args as any).value || 0n, receiveToken.decimals));
                  const price = getTokenPrice(receiveToken.symbol);
                  amountUsd = amount * price;
                } else {
                  return null;
                }
              } else if (sends.length > 0) {
                const sendToken = await getTokenMeta(publicClient, sends[0].address);
                if (sendToken) {
                  const isSwapToNative = txObj && txObj.to?.toLowerCase() === getContractAddress("swapRouter", targetChainId).toLowerCase();
                  if (isSwapToNative) {
                    type = "swap";
                    assetLabel = `${sendToken.symbol} → MST`;
                    amount = Number(formatUnits((sends[0].args as any).value || 0n, sendToken.decimals));
                    const sendPrice = getTokenPrice(sendToken.symbol);
                    amountUsd = amount * sendPrice;
                  } else {
                    type = "send";
                    assetLabel = sendToken.symbol;
                    amount = Number(formatUnits((sends[0].args as any).value || 0n, sendToken.decimals));
                    const price = getTokenPrice(sendToken.symbol);
                    amountUsd = amount * price;
                  }
                } else {
                  return null;
                }
              } else if (receives.length > 0) {
                const receiveToken = await getTokenMeta(publicClient, receives[0].address);
                if (receiveToken) {
                  if (nativeValueSent > 0) {
                    type = "swap";
                    assetLabel = `MST → ${receiveToken.symbol}`;
                    amount = Number(formatUnits((receives[0].args as any).value || 0n, receiveToken.decimals));
                    const price = getTokenPrice(receiveToken.symbol);
                    amountUsd = amount * price;
                  } else {
                    type = "receive";
                    assetLabel = receiveToken.symbol;
                    amount = Number(formatUnits((receives[0].args as any).value || 0n, receiveToken.decimals));
                    const price = getTokenPrice(receiveToken.symbol);
                    amountUsd = amount * price;
                  }
                } else {
                  return null;
                }
              } else {
                return null;
              }
            }
          }

          let timestamp = Date.now();
          const firstLog = txLogs[0];
          if (firstLog && firstLog.blockNumber) {
            let block = blockCache.get(firstLog.blockNumber);
            if (!block) {
              block = await publicClient.getBlock({ blockNumber: firstLog.blockNumber }).catch(() => null);
              if (block) blockCache.set(firstLog.blockNumber, block);
            }
            if (block && block.timestamp) {
              timestamp = Number(block.timestamp) * 1000;
            }
          }

          return {
            id: `${address}-${hash}`,
            type,
            asset: assetLabel,
            amount,
            amountUsd,
            network: chainLabel(targetChainId),
            hash,
            timestamp,
            status: "confirmed",
            explorerUrl: `https://testnet.mstscan.com/tx/${hash}`,
          } as PortfolioActivity;
        } catch (err) {
          console.error(`Error parsing tx logs for hash ${hash}`, err);
          return null;
        }
      }
    );

    parsedActivities.push(...parsedActivitiesRaw.filter((a): a is PortfolioActivity => a !== null));

    // Direct log-based balance reconstruction
    const runningBalances: Record<string, number> = {};
    assets.forEach((asset) => {
      runningBalances[asset.symbol] = asset.balance;
    });

    balanceHistory.push({
      timestamp: Date.now(),
      balances: { ...runningBalances }
    });

    for (const { hash, logs: txLogs } of logsList) {
      const sends = txLogs.filter(l => l.eventName === "Transfer" && l.args && (l.args as any).from?.toLowerCase() === address.toLowerCase());
      const receives = txLogs.filter(l => l.eventName === "Transfer" && l.args && (l.args as any).to?.toLowerCase() === address.toLowerCase());

      sends.forEach(log => {
        const lowerAddr = log.address.toLowerCase();
        let token = TOKENS.find(t => t.address?.toLowerCase() === lowerAddr);
        let symbol = token?.symbol;
        let decimals = token?.decimals;
        if (!symbol && tokenMetaCache.has(lowerAddr)) {
          const cached = tokenMetaCache.get(lowerAddr)!;
          symbol = cached.symbol;
          decimals = cached.decimals;
        }
        if (symbol && decimals !== undefined) {
          const amt = Number(formatUnits((log.args as any).value || 0n, decimals));
          runningBalances[symbol] = (runningBalances[symbol] || 0) + amt;
        }
      });

      receives.forEach(log => {
        const lowerAddr = log.address.toLowerCase();
        let token = TOKENS.find(t => t.address?.toLowerCase() === lowerAddr);
        let symbol = token?.symbol;
        let decimals = token?.decimals;
        if (!symbol && tokenMetaCache.has(lowerAddr)) {
          const cached = tokenMetaCache.get(lowerAddr)!;
          symbol = cached.symbol;
          decimals = cached.decimals;
        }
        if (symbol && decimals !== undefined) {
          const amt = Number(formatUnits((log.args as any).value || 0n, decimals));
          runningBalances[symbol] = Math.max(0, (runningBalances[symbol] || 0) - amt);
        }
      });

      let timestamp = Date.now();
      const firstLog = txLogs[0];
      if (firstLog && firstLog.blockNumber) {
        const cachedBlock = blockCache.get(firstLog.blockNumber);
        if (cachedBlock && cachedBlock.timestamp) {
          timestamp = Number(cachedBlock.timestamp) * 1000;
        }
      }

      balanceHistory.push({
        timestamp,
        balances: { ...runningBalances }
      });
    }

    balanceHistory.sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.error("General error querying logs for activity", err);
  }

  const sortedActivities = parsedActivities.sort((a, b) => b.timestamp - a.timestamp);
  const activity: PortfolioActivity[] = sortedActivities;

  const isNativeBalance = true;
  const nativeSymbol = "USDC";

  const portfolio: Portfolio = {
    address,
    portfolioName: "Connected Wallet",
    walletLabel: chainLabel(targetChainId),
    ensName: null,
    valueUsd: usdcAmount,
    change24h: 0,
    networkCount: assetsValueUsd > 0 ? 1 : 0,
    assetCount: withAllocation.length,
    isNativeBalance,
    nativeSymbol,
    stats: {
      totalAssets: withAllocation.length,
      totalNetworks: assetsValueUsd > 0 ? 1 : 0,
      totalPositions: positions.length,
      transactions: activity.length,
      portfolioChange24h: 0,
      largestHolding: largestHolding
        ? {
          symbol: largestHolding.symbol,
          valueUsd: largestHolding.valueUsd,
          allocation: totalValueUsd > 0 ? (largestHolding.valueUsd / totalValueUsd) * 100 : 0,
        }
        : { symbol: "—", valueUsd: 0, allocation: 0 },
    },
  };

  console.log("=== PORTFOLIO SNAPSHOT DIAGNOSTICS ===");
  console.log("Connected Address:", address);
  console.log("Native tMST balance raw:", nativeBalance.toString());
  console.log("Native tMST balance parsed:", nativeAmount, "tMST");
  console.log("WMST balance parsed:", wmstAmount, "WMST");
  console.log("MST Price:", liveMstPrice);
  console.log("Asset list balances:", assets.map(a => `${a.symbol}: balance=${a.balance}, price=${a.priceUsd}, valueUsd=${a.valueUsd}`));
  console.log("LP Positions count:", positions.length);
  positions.forEach(p => {
    console.log(`  LP Position ID ${p.id}: reserves USDC=${p.reserves?.USDC}, WMST=${p.reserves?.WMST}, totalUsd=${p.liquidityUsd}`);
  });
  console.log("Calculated Total Wallet assetsValueUsd:", assetsValueUsd);
  console.log("======================================");

  return {
    portfolio,
    assets: withAllocation,
    activity,
    positions,
    chartPoint: {
      time: Math.floor(Date.now() / 1000),
      value: totalValueUsd,
    },
    balanceHistory,
  };
}
