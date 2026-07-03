import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TokenAvatar } from "@/components/swap/TokenSelectorModal";
import { formatPortfolioPct, formatPortfolioUsd, formatAssetUsd, formatActivityUsd, formatPortfolioTime, activityLabel } from "../utils/portfolio-format";
import { displayTokenSymbol } from "@/config";
import type { PortfolioActivity, PortfolioAsset, PortfolioPosition } from "../types";

interface PortfolioOverviewPanelsProps {
  assets: PortfolioAsset[];
  activity: PortfolioActivity[];
  positions: PortfolioPosition[];
}

export function PortfolioOverviewPanels({ assets, activity, positions }: PortfolioOverviewPanelsProps) {
  const topAssets = [...assets].sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 4);
  const topActivity = activity.slice(0, 4);
  const topPositions = positions.slice(0, 4);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="glass rounded-[1.75rem] border-white/60 shadow-soft">
        <CardHeader className="p-5 pb-0">
          <div className="text-base font-bold">Top holdings</div>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          {topAssets.length ? topAssets.map((asset) => <HoldingRow key={asset.id} asset={asset} />) : <EmptyState title="No holdings yet" body="Connect a wallet with onchain assets to populate holdings." />}
        </CardContent>
      </Card>

      <Card className="glass rounded-[1.75rem] border-white/60 shadow-soft">
        <CardHeader className="p-5 pb-0">
          <div className="text-base font-bold">Recent activity</div>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          {topActivity.length ? topActivity.map((item) => <ActivityRow key={item.id} activity={item} />) : <EmptyState title="No activity available" body="This wallet has no indexed activity source yet." />}
        </CardContent>
      </Card>

      <Card className="glass rounded-[1.75rem] border-white/60 shadow-soft">
        <CardHeader className="p-5 pb-0">
          <div className="text-base font-bold">Top positions</div>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          {topPositions.length ? topPositions.map((position) => <PositionRow key={position.id} position={position} />) : <EmptyState title="No positions found" body="LP position data will appear here when connected to a position source." />}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-4 text-center">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}

function HoldingRow({ asset }: { asset: PortfolioAsset }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
      <div className="flex items-center gap-3">
        <TokenAvatar symbol={asset.symbol} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{displayTokenSymbol(asset.symbol)}</div>
              <div className="text-xs text-muted-foreground">{asset.network}</div>
            </div>
            <div className="text-right text-sm font-semibold">{formatAssetUsd(asset.symbol, asset.valueUsd)}</div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatPortfolioPct(asset.allocation)}</span>
            <span>{asset.balance.toLocaleString(undefined, { maximumFractionDigits: 18 })} {displayTokenSymbol(asset.symbol)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: PortfolioActivity }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium">{activityLabel(activity.type)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {activity.asset.split(" → ").map(s => displayTokenSymbol(s)).join(" → ")} • {activity.network}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{formatActivityUsd(activity.asset, activity.amountUsd)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatPortfolioTime(activity.timestamp)}</div>
        </div>
      </div>
    </div>
  );
}

function PositionRow({ position }: { position: PortfolioPosition }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium">{position.pool}</div>
          <div className="mt-1 text-xs text-muted-foreground">{position.network}</div>
        </div>
        <div className="text-right text-sm font-semibold">{formatPortfolioUsd(position.liquidityUsd)}</div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>APR {position.apr.toFixed(1)}%</span>
        <span>{position.status}</span>
      </div>
    </div>
  );
}
