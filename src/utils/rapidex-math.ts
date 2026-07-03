// Rapidex V3 Liquidity Math Utilities for exact reserve calculations in the frontend.

export function getSqrtRatioAtTick(tick: number): bigint {
  const ratio = Math.pow(1.0001, tick);
  const sqrtRatio = Math.sqrt(ratio);
  const q96 = 2n ** 96n; // 2^96
  return BigInt(Math.floor(sqrtRatio * Number(q96)));
}

export function getAmountsForLiquidity(
  liquidity: bigint,
  sqrtPriceX96: bigint,
  tickLower: number,
  tickUpper: number
): [bigint, bigint] {
  if (liquidity === 0n || sqrtPriceX96 === 0n) return [0n, 0n];

  const q96 = 2n ** 96n;
  let sqrtPriceLower = getSqrtRatioAtTick(tickLower);
  let sqrtPriceUpper = getSqrtRatioAtTick(tickUpper);

  if (sqrtPriceLower > sqrtPriceUpper) {
    const temp = sqrtPriceLower;
    sqrtPriceLower = sqrtPriceUpper;
    sqrtPriceUpper = temp;
  }

  if (sqrtPriceX96 <= sqrtPriceLower) {
    // Current price is below the range (all token0)
    const amount0 = (liquidity * q96 * (sqrtPriceUpper - sqrtPriceLower)) / (sqrtPriceLower * sqrtPriceUpper);
    return [amount0, 0n];
  } else if (sqrtPriceX96 >= sqrtPriceUpper) {
    // Current price is above the range (all token1)
    const amount1 = (liquidity * (sqrtPriceUpper - sqrtPriceLower)) / q96;
    return [0n, amount1];
  } else {
    // Current price is within range (mixed)
    const amount0 = (liquidity * q96 * (sqrtPriceUpper - sqrtPriceX96)) / (sqrtPriceX96 * sqrtPriceUpper);
    const amount1 = (liquidity * (sqrtPriceX96 - sqrtPriceLower)) / q96;
    return [amount0, amount1];
  }
}

export function getOtherAmountForToken(
  amount: bigint,
  inputTokenIndex: 0 | 1,
  sqrtPriceX96: bigint,
  tickLower: number,
  tickUpper: number
): bigint {
  if (amount === 0n || sqrtPriceX96 === 0n) return 0n;

  const q96 = 2n ** 96n;
  let sqrtPriceLower = getSqrtRatioAtTick(tickLower);
  let sqrtPriceUpper = getSqrtRatioAtTick(tickUpper);

  if (sqrtPriceLower > sqrtPriceUpper) {
    const temp = sqrtPriceLower;
    sqrtPriceLower = sqrtPriceUpper;
    sqrtPriceUpper = temp;
  }

  if (sqrtPriceX96 <= sqrtPriceLower) {
    // Current price is below the range (all token0)
    return 0n;
  } else if (sqrtPriceX96 >= sqrtPriceUpper) {
    // Current price is above the range (all token1)
    return 0n;
  } else {
    // Current price is within range (mixed)
    if (inputTokenIndex === 0) {
      // input is amount0, calculate amount1
      // L = (amount0 * sqrtPriceX96 * sqrtPriceUpper) / (q96 * (sqrtPriceUpper - sqrtPriceX96))
      const numerator = amount * sqrtPriceX96 * sqrtPriceUpper;
      const denominator = q96 * (sqrtPriceUpper - sqrtPriceX96);
      if (denominator === 0n) return 0n;
      const liquidity = numerator / denominator;
      
      // amount1 = (L * (sqrtPriceX96 - sqrtPriceLower)) / q96
      return (liquidity * (sqrtPriceX96 - sqrtPriceLower)) / q96;
    } else {
      // input is amount1, calculate amount0
      // L = (amount1 * q96) / (sqrtPriceX96 - sqrtPriceLower)
      const denominator = sqrtPriceX96 - sqrtPriceLower;
      if (denominator === 0n) return 0n;
      const liquidity = (amount * q96) / denominator;
      
      // amount0 = (L * q96 * (sqrtPriceUpper - sqrtPriceX96)) / (sqrtPriceX96 * sqrtPriceUpper)
      const numerator = liquidity * q96 * (sqrtPriceUpper - sqrtPriceX96);
      const denominator0 = sqrtPriceX96 * sqrtPriceUpper;
      if (denominator0 === 0n) return 0n;
      return numerator / denominator0;
    }
  }
}

export function tickToPrice(tick: number, decimalsA: number, decimalsB: number, isToken0A: boolean): number {
  const ratio = Math.pow(1.0001, isToken0A ? tick : -tick);
  return ratio * Math.pow(10, decimalsA - decimalsB);
}

export function priceToTick(price: number, decimalsA: number, decimalsB: number, isToken0A: boolean): number {
  if (price <= 0) return 0;
  const ratio = price / Math.pow(10, decimalsA - decimalsB);
  const logRatio = Math.log(ratio) / Math.log(1.0001);
  const tick = isToken0A ? logRatio : -logRatio;
  let rounded = Math.round(tick);
  if (rounded < -887272) rounded = -887272;
  if (rounded > 887272) rounded = 887272;
  return rounded;
}


