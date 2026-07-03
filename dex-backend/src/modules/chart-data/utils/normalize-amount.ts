export function normalizeAmount(amount: number, decimals: number): number {
  return amount / Math.pow(10, decimals);
}
