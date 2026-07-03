import { useMemo } from "react";
import { TokenAvatar } from "@/components/swap/TokenSelectorModal";
import { formatAssetUsd, formatPortfolioPct } from "../utils/portfolio-format";
import { displayTokenSymbol } from "@/config";
import type { PortfolioAsset } from "../types";

interface PortfolioAssetsBoxesProps {
  assets: PortfolioAsset[];
}

export function PortfolioAssetsBoxes({ assets }: PortfolioAssetsBoxesProps) {
  const sorted = useMemo(() => [...assets].sort((a, b) => b.valueUsd - a.valueUsd), [assets]);

  if (!sorted.length) return null;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {sorted.map((asset) => (
        <div key={asset.id} className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <TokenAvatar symbol={asset.symbol} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-base">{displayTokenSymbol(asset.symbol)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{asset.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-base">
                    {asset.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {asset.valueUsd.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{ width: `${Math.min(100, asset.allocation)}%` }}
                />
              </div>

              <div className="mt-2 flex justify-between items-center text-xs">
                <span className="text-muted-foreground">{asset.network}</span>
                <span className="text-muted-foreground">+{formatPortfolioPct(asset.allocation)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
