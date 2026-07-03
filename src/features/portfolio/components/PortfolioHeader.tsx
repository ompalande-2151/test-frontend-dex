import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPortfolioAddress, formatPortfolioPct, formatPortfolioUsd } from "../utils/portfolio-format";
import type { Portfolio } from "../types";

interface PortfolioHeaderProps {
  portfolio: Portfolio | null;
  ensName: string | null;
  walletAddress: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

function colorPair(seed: string) {
  const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const first = hash % 360;
  const second = (first + 70) % 360;
  return `linear-gradient(135deg, hsl(${first} 70% 55%), hsl(${second} 70% 45%))`;
}

export function PortfolioHeader({ portfolio, ensName, walletAddress, isLoading, onRefresh }: PortfolioHeaderProps) {
  const displayAddress = formatPortfolioAddress(walletAddress);
  const isConnectedWallet = portfolio?.portfolioName === "Connected Wallet";
  const name = isConnectedWallet ? displayAddress : (portfolio?.portfolioName ?? "Portfolio");
  const subAddressLabel = isConnectedWallet ? "Connected Wallet" : displayAddress;
  const walletLabel = portfolio?.walletLabel ?? "Wallet connected";
  const walletInitials = useMemo(() => displayAddress.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase(), [displayAddress]);

  return (
    <Card className="glass overflow-hidden rounded-[2rem] border-white/60 shadow-deep">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,92,240,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(20,184,166,0.12),transparent_28%)]" />
      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16 border border-white/70 shadow-soft sm:h-20 sm:w-20">
            <AvatarFallback
              className="text-sm font-semibold text-white"
              style={{ background: colorPair(walletAddress) }}
            >
              {walletInitials || "PF"}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Portfolio dashboard
            </div>

            {isLoading ? <Skeleton className="h-9 w-52 rounded-2xl" /> : <h1 className="font-display text-4xl font-bold text-balance sm:text-5xl">{name}</h1>}

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-5 w-36 rounded-full" />
              ) : (
                <>
                  <span className={isConnectedWallet ? "font-medium text-foreground" : "font-mono text-foreground"}>{subAddressLabel}</span>
                  <span>•</span>
                  <span>{ensName ?? "ENS placeholder"}</span>
                  <span>•</span>
                  <span>{walletLabel}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.75rem] border border-white/60 bg-surface/70 p-4 shadow-soft sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">value</div>
            {isLoading ? (
              <Skeleton className="h-10 w-40 rounded-2xl" />
            ) : (
              <div className="text-3xl font-semibold tracking-tight">
                {portfolio?.isNativeBalance
                  ? `${(portfolio?.valueUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${portfolio.nativeSymbol ?? "MST"}`
                  : formatPortfolioUsd(portfolio?.valueUsd ?? 0)}
              </div>
            )}
            <div className={`text-sm font-medium ${portfolio && portfolio.change24h >= 0 ? "text-success" : "text-destructive"}`}>
              {isLoading ? <Skeleton className="h-4 w-24 rounded-full" /> : formatPortfolioPct(portfolio?.change24h ?? 0)}
            </div>
          </div>

          <div className="grid gap-2 sm:justify-items-end">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Networks</span>
              {isLoading ? <Skeleton className="h-4 w-10 rounded-full" /> : <span className="font-semibold">{portfolio?.networkCount ?? 0}</span>}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Assets</span>
              {isLoading ? <Skeleton className="h-4 w-10 rounded-full" /> : <span className="font-semibold">{portfolio?.assetCount ?? 0}</span>}
            </div>
            <Button onClick={onRefresh} variant="outline" className="rounded-full border-border/70 bg-surface/80">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
