"use client";

import type { DashboardStatusCount } from "@/types";

const COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  ASSIGNED: "#6366f1",
  IN_PROGRESS: "#0ea5e9",
  COMPLETED: "#10b981",
  CLOSED: "#64748b",
};

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

export function StatusDonut({ items }: { items: DashboardStatusCount[] }) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  let offset = 0;
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">Jobs by Status</h3>
      <p className="mt-0.5 text-sm text-slate-500">Live distribution</p>
      <div className="mt-5 flex items-center justify-center">
        <div className="relative">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r={RADIUS} fill="none" strokeWidth="16" className="stroke-slate-100 dark:stroke-slate-800" />
            {total > 0 &&
              items.map((item) => {
                const length = (item.count / total) * CIRC;
                const el = (
                  <circle
                    key={item.status}
                    cx="70"
                    cy="70"
                    r={RADIUS}
                    fill="none"
                    stroke={COLORS[item.status] ?? "#6366f1"}
                    strokeWidth="16"
                    strokeDasharray={`${length} ${CIRC - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return el;
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{total}</span>
            <span className="text-xs text-slate-500">Jobs</span>
          </div>
        </div>
      </div>
      <ul className="mt-5 space-y-2.5">
        {items.length === 0 && <li className="text-sm text-slate-500">No jobs yet.</li>}
        {items.map((item) => (
          <li key={item.status} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[item.status] ?? "#6366f1" }} />
              {item.status.replace("_", " ")}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
