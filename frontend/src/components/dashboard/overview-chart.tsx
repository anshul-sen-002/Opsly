"use client";

import type { DashboardOverview } from "@/types";

const SERIES = [
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "inProgress", label: "In progress", color: "#6366f1" },
  { key: "pending", label: "Pending", color: "#f59e0b" },
] as const;

function points(values: number[], width: number, height: number, pad: number): string {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => `${(pad + i * step).toFixed(1)},${(height - pad - (v / max) * (height - pad * 2)).toFixed(1)}`)
    .join(" ");
}

export function OverviewChart({ overview, days }: { overview: DashboardOverview; days: number }) {
  const W = 560;
  const H = 190;
  const PAD = 14;
  const grid = [0.25, 0.5, 0.75].map((f) => PAD + (H - PAD * 2) * f);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Jobs Overview</h3>
          <p className="mt-0.5 text-sm text-slate-500">Last {days} days, from live jobs</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex-1">
        <svg viewBox={`0 0 ${W} ${H + 22}`} className="h-48 w-full" role="img" aria-label="Jobs per day chart">
          {grid.map((y) => (
            <line key={y} x1={PAD} x2={W - PAD} y1={y} y2={y} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" />
          ))}
          {SERIES.map((s) => (
            <polyline
              key={s.key}
              points={points(overview[s.key], W, H, PAD)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {overview.labels.map((label, i) => {
            const x = overview.labels.length > 1 ? PAD + (i * (W - PAD * 2)) / (overview.labels.length - 1) : W / 2;
            const show = overview.labels.length <= 10 || i % Math.ceil(overview.labels.length / 8) === 0;
            if (!show) return null;
            return (
              <text key={`${label}-${i}`} x={x} y={H + 16} textAnchor="middle" className="fill-slate-400 text-[10px]">
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
