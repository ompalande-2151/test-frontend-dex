import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPortfolioUsd } from "../utils/portfolio-format";
import type { PortfolioChartPoint, PortfolioTimeframe } from "../types";

const TIMEFRAMES: PortfolioTimeframe[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

interface PortfolioValueChartProps {
  data: PortfolioChartPoint[];
  selectedTimeframe: PortfolioTimeframe;
  onTimeframeChange: (timeframe: PortfolioTimeframe) => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: string | null;
  valueUsd?: number;
  isNativeBalance?: boolean;
  nativeSymbol?: string;
}

export function PortfolioValueChart({
  data,
  selectedTimeframe,
  onTimeframeChange,
  isLoading,
  isError,
  error,
  valueUsd,
  isNativeBalance,
  nativeSymbol,
}: PortfolioValueChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => {
      const date = new Date(point.time * 1000);
      let label = "";
      if (selectedTimeframe === "1D") {
        label = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      } else {
        label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      }
      return { ...point, label };
    });
  }, [data, selectedTimeframe]);
  const latest = chartData.at(-1)?.value ?? valueUsd ?? 0;

  const formatValue = (val: number, compact = false) => {
    if (isNativeBalance) {
      return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${nativeSymbol ?? "MST"}`;
    }
    return formatPortfolioUsd(val, compact);
  };

  return (
    <Card className="glass overflow-hidden rounded-[2rem] border-white/60 shadow-float">
      <CardHeader className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Portfolio value</div>
          {isLoading ? <Skeleton className="mt-2 h-8 w-40 rounded-2xl" /> : <div className="mt-2 text-3xl font-semibold tracking-tight">{formatValue(latest)}</div>}
        </div>

        <div className="flex flex-wrap gap-2 rounded-full border border-border/70 bg-surface/80 p-1">
          {TIMEFRAMES.map((timeframe) => (
            <button
              key={timeframe}
              type="button"
              onClick={() => onTimeframeChange(timeframe)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        {isLoading ? (
          <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-background/60 p-4">
            <Skeleton className="h-[280px] w-full rounded-[1.5rem]" />
          </div>
        ) : isError ? (
          <StateBox title="Unable to load portfolio chart" body={error ?? "Please try again in a moment."} />
        ) : chartData.length === 0 ? (
          <StateBox title="No portfolio history yet" body="Connect a wallet or refresh to populate chart history." />
        ) : (
          <div className="h-[320px] w-full rounded-[1.5rem] border border-border/60 bg-background/60 p-2 sm:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(var(--primary))" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="rgb(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12} minTickGap={32} />
                <YAxis tickLine={false} axisLine={false} width={80} tickFormatter={(value: number) => formatValue(value, true)} />
                <Tooltip content={<ChartTooltip isNativeBalance={isNativeBalance} nativeSymbol={nativeSymbol} />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="rgb(var(--primary))"
                  strokeWidth={3}
                  fill="url(#portfolioValueFill)"
                  dot={false}
                  activeDot={{ r: 5, fill: "rgb(var(--primary))", stroke: "white", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  isNativeBalance,
  nativeSymbol,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  isNativeBalance?: boolean;
  nativeSymbol?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0]?.value ?? 0;
  const displayVal = isNativeBalance
    ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${nativeSymbol ?? "MST"}`
    : formatPortfolioUsd(value);
  return (
    <div className="rounded-2xl border border-border/70 bg-background/95 px-4 py-3 shadow-deep backdrop-blur-xl">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{displayVal}</div>
    </div>
  );
}

function StateBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-background/50 p-8 text-center">
      <div className="max-w-sm space-y-2">
        <div className="text-base font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}