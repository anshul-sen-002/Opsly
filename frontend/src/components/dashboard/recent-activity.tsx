"use client";

import { CalendarPlus, FileText, ReceiptIndianRupee, Wrench } from "lucide-react";
import type { DashboardActivityItem } from "@/types";
import { formatDateTime } from "@/lib/utils";

const ICONS: Record<string, typeof Wrench> = {
  JOB_CREATED: Wrench,
  INVOICE_CREATED: FileText,
  PAYMENT_RECEIVED: ReceiptIndianRupee,
  CUSTOMER_ADDED: CalendarPlus,
};

/** Per-type icon tint so each activity reads at a glance */
const TONES: Record<string, string> = {
  JOB_CREATED: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  INVOICE_CREATED: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  PAYMENT_RECEIVED: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  CUSTOMER_ADDED: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
};

const DEFAULT_TONE = "bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400";

export function RecentActivity({ items }: { items: DashboardActivityItem[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Live from jobs, invoices and payments
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          Live
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item, i) => {
            const Icon = ICONS[item.type] ?? Wrench;
            return (
              <li
                key={`${item.type}-${item.createdAt}-${i}`}
                className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    TONES[item.type] ?? DEFAULT_TONE
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{item.title}</p>
                  {/* Mobile: timestamp sits under the title so the title keeps its room */}
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 sm:hidden">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
                {/* Desktop: timestamp on the right, single row */}
                <span className="hidden shrink-0 text-xs text-slate-400 dark:text-slate-500 sm:block">
                  {formatDateTime(item.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
