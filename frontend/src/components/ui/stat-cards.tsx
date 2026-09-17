import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "indigo" | "emerald" | "amber" | "blue" | "rose" | "violet";

const TONES: Record<StatTone, { card: string; tile: string; ghost: string; ring: string }> = {
  indigo: {
    card: "border-indigo-100 bg-indigo-50/60 dark:border-indigo-500/20 dark:bg-indigo-500/[0.06]",
    tile: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    ghost: "text-indigo-400 dark:text-indigo-500",
    ring: "#6366f1",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]",
    tile: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    ghost: "text-emerald-400 dark:text-emerald-500",
    ring: "#10b981",
  },
  amber: {
    card: "border-amber-100 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/[0.06]",
    tile: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    ghost: "text-amber-400 dark:text-amber-500",
    ring: "#f59e0b",
  },
  blue: {
    card: "border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/[0.06]",
    tile: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    ghost: "text-blue-400 dark:text-blue-500",
    ring: "#3b82f6",
  },
  violet: {
    card: "border-violet-100 bg-violet-50/60 dark:border-violet-500/20 dark:bg-violet-500/[0.06]",
    tile: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    ghost: "text-violet-400 dark:text-violet-500",
    ring: "#8b5cf6",
  },
  rose: {
    card: "border-rose-100 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/[0.06]",
    tile: "bg-rose-100 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300",
    ghost: "text-rose-400 dark:text-rose-500",
    ring: "#f43f5e",
  },
};

export interface StatCardItem {
  key: string;
  label: string;
  value: number;
  icon: LucideIcon;
  tone: StatTone;
  sub?: string;
  subTone?: "up" | "down" | "flat";
  /** 0–100 — when set, a progress ring replaces the ghost icon */
  progress?: number;
}

const RING_C = 2 * Math.PI * 18;

/** Month-over-month growth as StatCards sub props — shared by the list pages */
export function growthSub(growth: { arrow: "up" | "down" | "flat"; label: string }): Pick<StatCardItem, "sub" | "subTone"> {
  return growth.arrow === "flat" ? { sub: growth.label } : { sub: growth.label, subTone: growth.arrow };
}

/** Pastel stat cards with ghost icons — shared by the users + customers list pages */
export function StatCards({ items }: { items: StatCardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => {
        const tone = TONES[item.tone];
        const Icon = item.icon;
        const progress = item.progress === undefined ? null : Math.min(100, Math.max(0, item.progress));
        return (
          <div
            key={item.key}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md",
              tone.card
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={cn("flex size-10 items-center justify-center rounded-full", tone.tile)}>
                <Icon className="size-5" />
              </span>
              {progress !== null ? (
                <span className="relative flex size-12 items-center justify-center" role="img" aria-label={`${Math.round(progress)} percent`}>
                  <svg viewBox="0 0 44 44" className="size-12 -rotate-90" aria-hidden>
                    <circle cx="22" cy="22" r="18" fill="none" strokeWidth="5" className="stroke-slate-200 dark:stroke-slate-700" />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke={tone.ring}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      strokeDashoffset={RING_C - (RING_C * progress) / 100}
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {Math.round(progress)}%
                  </span>
                </span>
              ) : (
                <Icon aria-hidden className={cn("pointer-events-none absolute right-4 top-1/2 size-16 -translate-y-1/2 opacity-20", tone.ghost)} />
              )}
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{item.value}</p>
            {item.sub && (
              <p
                className={cn(
                  "mt-1 text-xs",
                  item.subTone === "up"
                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                    : item.subTone === "down"
                      ? "font-medium text-rose-500"
                      : "text-slate-400 dark:text-slate-500"
                )}
              >
                {item.subTone === "up" ? "↑ " : item.subTone === "down" ? "↓ " : ""}
                {item.sub}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
