"use client";

import { Avatar } from "@/components/ui/avatar";
import type { DashboardTopCustomer } from "@/types";

export function TopCustomers({ items }: { items: DashboardTopCustomer[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Top Customers</h3>
        <p className="mt-0.5 text-sm text-slate-500">By job volume</p>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-500">No customers yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((c) => (
            <li key={c.id} className="px-6 py-3.5 transition hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.06]">
              <div className="flex items-center gap-3">
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.jobCount} jobs</p>
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{c.share}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.min(c.share, 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
