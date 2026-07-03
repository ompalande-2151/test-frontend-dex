export function calculatePrice(amountIn: number, amountOut: number): number {
  if (amountIn === 0) {
    return 0;
  }

  return amountOut / amountIn;
}
