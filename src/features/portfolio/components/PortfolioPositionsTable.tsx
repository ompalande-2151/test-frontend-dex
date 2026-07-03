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
import { formatPortfolioUsd, positionStatusTone } from "../utils/portfolio-format";
import type { PortfolioPosition } from "../types";

const PAGE_SIZE = 6;
type SortKey = "liquidity" | "apr" | "fees";

interface PortfolioPositionsTableProps {
  positions: PortfolioPosition[];
  isLoading?: boolean;
  isError?: boolean;
  error?: string | null;
}

export function PortfolioPositionsTable({ positions, isLoading, isError, error }: PortfolioPositionsTableProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("liquidity");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = positions.filter((position) => {
      if (!term) return true;
      return [position.pool, position.network, position.status].some((value) =>
        value.toLowerCase().includes(term),
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "apr":
          return b.apr - a.apr;
        case "fees":
          return b.feesEarnedUsd - a.feesEarnedUsd;
        case "liquidity":
        default:
          return b.liquidityUsd - a.liquidityUsd;
      }
    });
  }, [positions, search, sort]);

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
            placeholder="Search pool or status"
            className="h-11 rounded-2xl border-border/70 bg-surface/80 pl-9"
          />
        </label>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-surface/80">
            <SelectValue placeholder="Sort by liquidity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="liquidity">Sort by liquidity</SelectItem>
            <SelectItem value="apr">Sort by APR</SelectItem>
            <SelectItem value="fees">Sort by fees earned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PositionsSkeleton />
      ) : isError ? (
        <StateBox title="Unable to load positions" body={error ?? "Please refresh the portfolio."} />
      ) : rows.length === 0 ? (
        <StateBox title="No matching positions" body="Try adjusting search or sort filters." />
      ) : (
        <div className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-surface/80 shadow-soft">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader className="sticky top-0 z-10 bg-surface/95 backdrop-blur-xl">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="px-4 py-4">Pool</TableHead>
                  <TableHead className="px-4 py-4">Liquidity</TableHead>
                  <TableHead className="px-4 py-4">APR</TableHead>
                  <TableHead className="px-4 py-4">Fees earned</TableHead>
                  <TableHead className="px-4 py-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((position) => (
                  <TableRow key={position.id} className="border-border/60 transition-colors hover:bg-background/70">
                    <TableCell className="px-4 py-4">
                      <div>
                        <div className="font-medium">{position.pool}</div>
                        <div className="text-xs text-muted-foreground">{position.network}</div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 font-medium">{formatPortfolioUsd(position.liquidityUsd)}</TableCell>
                    <TableCell className="px-4 py-4 font-medium text-success">{position.apr.toFixed(1)}%</TableCell>
                    <TableCell className="px-4 py-4">{formatPortfolioUsd(position.feesEarnedUsd)}</TableCell>
                    <TableCell className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${positionStatusTone(position.status)}`}>
                        {position.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(rows.length, (page - 1) * PAGE_SIZE + 1)}-{Math.min(rows.length, page * PAGE_SIZE)} of {rows.length} positions
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

function PositionsSkeleton() {
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
