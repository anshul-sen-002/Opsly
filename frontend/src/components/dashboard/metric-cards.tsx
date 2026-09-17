import { Clock, DollarSign, ListChecks, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStat } from "@/types";

const ICONS: Record<string, { icon: LucideIcon; iconClass: string }> = {
  total_jobs: { icon: ListChecks, iconClass: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" },
  active_jobs: { icon: Wallet, iconClass: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" },
  pending_assignments: { icon: Clock, iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  customers: { icon: Users, iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  monthly_revenue: { icon: DollarSign, iconClass: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" },
};

function displayValue(stat: DashboardStat): string {
  if (stat.key === "monthly_revenue") return formatCurrency(stat.value);
  return stat.value % 1 === 0 ? String(Math.round(stat.value)) : String(stat.value);
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(max - min, 1);
  const w = 96;
  const h = 28;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 3 - ((p - min) / span) * (h - 6)).toFixed(1)}`)
    .join(" ");
  const color = positive ? "#10b981" : "#f43f5e";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCards({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => {
        const meta = ICONS[stat.key] ?? {
          icon: ListChecks,
          iconClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        };
        const Icon = meta.icon;
        const up = stat.trend === "UP";
        const flat = stat.trend === "FLAT";
        return (
          <div
            key={stat.key}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/[0.06]"
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`flex size-10 items-center justify-center rounded-xl ring-1 ring-transparent transition group-hover:ring-indigo-200 dark:group-hover:ring-indigo-500/30 ${meta.iconClass}`}>
                <Icon className="size-5" />
              </span>
              {!flat && <Sparkline points={stat.sparkline} positive={up} />}
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {displayValue(stat)}
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-300">{stat.label}</p>
            <p
              className={`mt-1 text-xs font-medium ${flat ? "text-slate-400" : up ? "text-emerald-600" : "text-rose-500"}`}
            >
              {!flat && (up ? "▲ " : "▼ ")}
              {stat.delta}
            </p>
          </div>
        );
      })}
    </div>
  );
}

