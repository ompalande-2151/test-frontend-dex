import { useMemo } from "react";

export function useVirtualList<T>(items: T[], visibleCount = 20) {
  return useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
}
