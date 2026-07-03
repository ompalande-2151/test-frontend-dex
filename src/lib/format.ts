export function shortAddress(address?: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function fmtUsd(value: number, options?: { compact?: boolean }): string {
  const compact = options?.compact ?? false;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function fmtNumber(value: number, options?: { compact?: boolean; max?: number }): string {
  const compact = options?.compact ?? false;
  const max = options?.max ?? 2;
  return new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: max
  }).format(value);
}

export function fmtPct(value: number, max = 2): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: max
  }).format(value);
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${formatted}%`;
}
