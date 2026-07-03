import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/Skeleton";

interface PortfolioMetricCardProps {
  label: string;
  value: string;
  helper?: string;
  loading?: boolean;
  tone?: "default" | "success" | "warning" | "destructive";
}

const toneClasses: Record<NonNullable<PortfolioMetricCardProps["tone"]>, string> = {
  default: "text-foreground font-black",
  success: "text-emerald-500 dark:text-emerald-400",
  warning: "text-amber-500 dark:text-warning",
  destructive: "text-rose-500 dark:text-destructive",
};

export function PortfolioMetricCard({ label, value, helper, loading, tone = "default" }: PortfolioMetricCardProps) {
  return (
    <Card className="shadow-float overflow-hidden border-border/80">
      <div className="p-6 flex flex-col justify-between space-y-4 h-full min-h-[135px]">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/90 dark:text-white leading-none">
          {label}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24 rounded-xl my-1" />
        ) : (
          <div className={`text-3xl font-extrabold tracking-tight leading-tight ${toneClasses[tone]}`}>
            {value}
          </div>
        )}
        {helper ? (
          <div className="text-xs text-foreground/80 dark:text-slate-200 font-normal leading-normal mt-auto">
            {helper}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
