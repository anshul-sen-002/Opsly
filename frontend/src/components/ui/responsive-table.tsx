"use client";

import type { ReactNode, Key } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  /** Table header text — also used as the mobile card field label */
  header: string;
  /** Either a string key into the row, or a render function for full control (badges, avatars, etc.) */
  accessor: keyof T | ((row: T) => ReactNode);
  /** Extra classes for the <td>/<th> */
  className?: string;
  /**
   * Hide this column on mobile cards.
   * On desktop it still renders as a table cell; on mobile the value is
   * omitted from the labelled-field list (use `actions` for row actions instead).
   */
  hideOnMobile?: boolean;
  /**
   * On mobile, render this column full-width as the card header above the
   * labelled fields. Use it for the primary cell (avatar + name) so the
   * card reads naturally.
   */
  primaryMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Row data */
  rows: T[];
  /** Unique value used for React keys */
  rowKey: keyof T;
  /** Optional row actions (buttons). On mobile these render at the bottom of each card. */
  actions?: (row: T) => ReactNode;
  /**
   * Optional custom mobile card renderer. When provided, it replaces the
   * generic labelled-field card on small screens so a page can match a
   * bespoke design. Desktop table rendering is unchanged.
   */
  renderMobileCard?: (row: T) => ReactNode;
}

function getCell<T>(col: Column<T>, row: T): ReactNode {
  const { accessor } = col;
  return typeof accessor === "function" ? accessor(row) : (row[accessor as keyof T] as ReactNode);
}

/**
 * A responsive data table: a normal `<table>` on `md+` screens, and a
 * stacked card per row on mobile so every field is visible without
 * horizontal scrolling.
 */
export function ResponsiveTable<T extends object>({
  columns,
  rows,
  rowKey,
  actions,
  renderMobileCard,
}: ResponsiveTableProps<T>) {
  const cardColumns = columns.filter((c) => !c.hideOnMobile && !c.primaryMobile);
  const primaryColumns = columns.filter((c) => c.primaryMobile && !c.hideOnMobile);

  return (
    <>
      {/* Desktop: classic table — horizontal scroll below lg so columns never crush */}
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={cn("whitespace-nowrap px-4 py-3 font-medium lg:px-5", col.className)}>
                  {col.header}
                </th>
              ))}
              {actions && <th className="whitespace-nowrap px-4 py-3 text-right font-medium lg:px-5">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={String(row[rowKey] as Key)} className="align-top transition hover:bg-indigo-50/40 dark:hover:bg-indigo-500/[0.05]">
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={cn(
                      "px-4 py-3.5 text-slate-500 lg:px-5",
                      col.header.toLowerCase() === "actions" && "text-right",
                      col.className
                    )}
                  >
                    {getCell(col, row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3.5 text-right align-top lg:px-5">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row) =>
          renderMobileCard ? (
            <div
              key={String(row[rowKey] as Key)}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              {renderMobileCard(row)}
            </div>
          ) : (
          <div
            key={String(row[rowKey] as Key)}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            {primaryColumns.length > 0 && (
              <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-white/[0.02]">
                {primaryColumns.map((col, i) => (
                  <div key={i} className="min-w-0">
                    {getCell(col, row)}
                  </div>
                ))}
              </div>
            )}

            <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 px-4 py-3 sm:grid-cols-2">
              {cardColumns.map((col, i) => (
                <div key={i} className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">{col.header}</dt>
                  <dd className="mt-0.5 break-words text-sm text-slate-700 dark:text-slate-200">
                    {getCell(col, row)}
                  </dd>
                </div>
              ))}
            </dl>

            {actions && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                {actions(row)}
              </div>
            )}
          </div>
          ),
        )}
      </div>
    </>
  );
}
