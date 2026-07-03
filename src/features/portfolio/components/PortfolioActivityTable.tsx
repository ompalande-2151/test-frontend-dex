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
import {
  activityLabel,
  activityStatusTone,
  formatPortfolioAddress,
  formatPortfolioTime,
  formatActivityUsd,
} from "../utils/portfolio-format";
import { displayTokenSymbol } from "@/config";
import type { PortfolioActivity, PortfolioActivityType } from "../types";

const PAGE_SIZE = 6;

interface PortfolioActivityTableProps {
  activity: PortfolioActivity[];
  isLoading?: boolean;
  isError?: boolean;
  error?: string | null;
}

const ACTIVITY_TYPES: Array<PortfolioActivityType | "all"> = ["all", "swap", "send", "receive", "approve", "bridge", "liquidity"];

export function PortfolioActivityTable({ activity, isLoading, isError, error }: PortfolioActivityTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof ACTIVITY_TYPES)[number]>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...activity]
      .filter((item) => {
        const matchesSearch =
          !term ||
          [item.type, item.asset, item.network, item.hash, item.status].some((value) =>
            value.toLowerCase().includes(term),
          );
        const matchesFilter = filter === "all" || item.type === filter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [activity, filter, search]);

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
            placeholder="Search hash, asset, network, or status"
            className="h-11 rounded-2xl border-border/70 bg-surface/80 pl-9"
          />
        </label>
        <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-surface/80">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type === "all" ? "All activity" : activityLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ActivitySkeleton />
      ) : isError ? (
        <StateBox title="Unable to load activity" body={error ?? "Please refresh the portfolio."} />
      ) : rows.length === 0 ? (
        <StateBox title="No matching activity" body="Try changing the search or filter." />
      ) : (
        <div className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-surface/80 shadow-soft">
          <div className="overflow-x-auto">
            <Table className="min-w-[960px]">
              <TableHeader className="sticky top-0 z-10 bg-surface/95 backdrop-blur-xl">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="px-4 py-4">Type</TableHead>
                  <TableHead className="px-4 py-4">Asset</TableHead>
                  <TableHead className="px-4 py-4">Amount</TableHead>
                  <TableHead className="px-4 py-4">Network</TableHead>
                  <TableHead className="px-4 py-4">Hash</TableHead>
                  <TableHead className="px-4 py-4">Date</TableHead>
                  <TableHead className="px-4 py-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.map((item) => (
                  <TableRow key={item.id} className="border-border/60 transition-colors hover:bg-background/70">
                    <TableCell className="px-4 py-4">
                      <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium capitalize">
                        {activityLabel(item.type)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4 font-medium">
                      {item.asset.split(" → ").map(s => displayTokenSymbol(s)).join(" → ")}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="font-medium">{item.amount.toLocaleString(undefined, { maximumFractionDigits: 18 })}</div>
                      <div className="text-xs text-muted-foreground">{formatActivityUsd(item.asset, item.amountUsd)}</div>
                    </TableCell>
                    <TableCell className="px-4 py-4">{item.network}</TableCell>
                    <TableCell className="px-4 py-4 font-mono text-xs text-muted-foreground">
                      <a href={item.explorerUrl} target="_blank" rel="noreferrer" className="hover:text-foreground">
                        {formatPortfolioAddress(item.hash, 6)}
                      </a>
                    </TableCell>
                    <TableCell className="px-4 py-4">{formatPortfolioTime(item.timestamp)}</TableCell>
                    <TableCell className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${activityStatusTone(item.status)}`}>
                        {item.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(rows.length, (page - 1) * PAGE_SIZE + 1)}-{Math.min(rows.length, page * PAGE_SIZE)} of {rows.length} events
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

function ActivitySkeleton() {
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
