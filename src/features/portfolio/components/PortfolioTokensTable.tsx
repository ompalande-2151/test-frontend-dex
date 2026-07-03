import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenAvatar } from "@/components/swap/TokenSelectorModal";
import { formatPortfolioPct, formatAssetUsd, formatAssetPrice } from "../utils/portfolio-format";
import { displayTokenSymbol } from "@/config";
import type { PortfolioAsset } from "../types";

const PAGE_SIZE = 6;
type SortKey = "value" | "balance" | "price" | "change" | "allocation";

interface PortfolioTokensTableProps {
  assets: PortfolioAsset[];
  isLoading?: boolean;
  isError?: boolean;
  error?: string | null;
}

export function PortfolioTokensTable({ assets, isLoading, isError, error }: PortfolioTokensTableProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("value");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = assets.filter((asset) => {
      if (!term) return true;
      return [asset.symbol, asset.name, asset.network].some((value) => value.toLowerCase().includes(term));
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "balance":
          return b.balance - a.balance;
        case "price":
          return b.priceUsd - a.priceUsd;
        case "change":
          return b.change24h - a.change24h;
        case "allocation":
          return b.allocation - a.allocation;
        case "value":
        default:
          return b.valueUsd - a.valueUsd;
      }
    });
  }, [assets, search, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search token, network, or asset name"
            className="h-11 rounded-2xl border-border/70 bg-surface/80 pl-9"
          />
        </label>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-surface/80">
            <SelectValue placeholder="Sort by value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="value">Sort by value</SelectItem>
            <SelectItem value="balance">Sort by balance</SelectItem>
            <SelectItem value="price">Sort by price</SelectItem>
            <SelectItem value="change">Sort by 24H change</SelectItem>
            <SelectItem value="allocation">Sort by allocation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TokensSkeleton />
      ) : isError ? (
        <StateBox title="Unable to load tokens" body={error ?? "Please refresh the portfolio."} />
      ) : rows.length === 0 ? (
        <StateBox title="No matching assets" body="Try adjusting search or sort filters." />
      ) : (
        <div className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-surface/80 shadow-soft">
          <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader className="sticky top-0 z-10 bg-surface/95 backdrop-blur-xl">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="px-4 py-4">Token</TableHead>
                  <TableHead className="px-4 py-4">Price</TableHead>
                  <TableHead className="px-4 py-4">24H Change</TableHead>
                  <TableHead className="px-4 py-4">Balance</TableHead>
                  <TableHead className="px-4 py-4">Value</TableHead>
                  <TableHead className="px-4 py-4">Allocation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((asset) => (
                  <TableRow key={asset.id} className="border-border/60 transition-colors hover:bg-background/70">
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <TokenAvatar symbol={asset.symbol} />
                        <div>
                          <div className="font-medium">{displayTokenSymbol(asset.symbol)}</div>
                          <div className="text-xs text-muted-foreground">{asset.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">{formatAssetPrice(asset.symbol, asset.priceUsd)}</TableCell>
                    <TableCell className={`px-4 py-4 font-medium ${asset.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                      {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                    </TableCell>
                    <TableCell className="px-4 py-4">{asset.balance.toLocaleString(undefined, { maximumFractionDigits: 18 })}</TableCell>
                    <TableCell className="px-4 py-4 font-medium">{formatAssetUsd(asset.symbol, asset.valueUsd)}</TableCell>
                    <TableCell className="px-4 py-4">{formatPortfolioPct(asset.allocation)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(rows.length, (page - 1) * PAGE_SIZE + 1)}-{Math.min(rows.length, page * PAGE_SIZE)} of {rows.length} assets
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-background px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <div className="rounded-full bg-muted px-3 py-2 text-sm font-medium">{page} / {totalPages}</div>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-background px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TokensSkeleton() {
  return (
    <div className="rounded-[1.75rem] border border-white/60 bg-surface/80 p-4 shadow-soft">
      <Skeleton className="h-[320px] w-full rounded-[1.5rem]" />
    </div>
  );
}

function StateBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[1.75rem] border border-dashed border-border/70 bg-surface/70 p-8 text-center">
      <div className="max-w-sm space-y-2">
        <div className="text-base font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}
