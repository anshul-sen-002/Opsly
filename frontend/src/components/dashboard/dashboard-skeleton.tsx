import type { CSSProperties } from "react";

/** Shared shimmer block — mirrors the pulse styling used by TableSkeleton. */
function Bar({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`}
      style={style}
    />
  );
}

/** Card shell matching the dashboard panels (border, radius, shadow). */
function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

/** Staff data sections: 5 metric cards, chart + donut, activity + top customers. */
function StaffSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <Bar className="size-10 rounded-xl" />
            <Bar className="mt-4 h-7 w-20" />
            <Bar className="mt-3 h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <Bar className="h-5 w-36" />
          <Bar className="mt-2 h-4 w-48" />
          <div className="mt-6 flex h-48 items-end gap-2">
            {[38, 62, 45, 78, 55, 88, 70, 95, 60, 82, 48, 74].map((h, i) => (
              <Bar key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
            ))}
          </div>
        </Panel>
        <Panel>
          <Bar className="h-5 w-32" />
          <Bar className="mt-2 h-4 w-24" />
          <div className="mt-5 flex justify-center">
            <Bar className="size-36 rounded-full border-[16px] border-slate-200 dark:border-slate-800" />
          </div>
          <div className="mt-5 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Bar className="h-3 w-24" />
                <Bar className="h-3 w-8" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <Bar className="h-5 w-40" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bar className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bar className="h-3 w-2/3" />
                  <Bar className="h-3 w-1/3" />
                </div>
                <Bar className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <Bar className="h-5 w-36" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bar className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bar className="h-3 w-3/4" />
                  <Bar className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

/** Customer data sections: 4 stat cards, two recent panels. */
function CustomerSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <Bar className="size-11 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Bar className="h-3 w-24" />
              <Bar className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((section) => (
          <div
            key={section}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <Bar className="h-4 w-36" />
              <Bar className="h-3 w-16" />
            </div>
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-100 px-3.5 py-3 dark:border-slate-800"
                >
                  <Bar className="h-3.5 w-2/3" />
                  <Bar className="mt-2 h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Visual loading placeholder for the data-driven sections of both dashboards.
 * The static shell (page header, hero, quick actions / CTA) is rendered by the
 * pages immediately — only API-backed panels wait behind this skeleton. It
 * mirrors their layout so the page doesn't jump when data arrives, and
 * announces itself to screen readers while the request is in flight.
 */
export function DashboardSkeleton({ variant = "staff" }: { variant?: "staff" | "customer" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={variant === "staff" ? "Loading dashboard" : "Loading your dashboard"}
      data-testid="dashboard-skeleton"
    >
      <span className="sr-only">
        {variant === "staff" ? "Loading dashboard…" : "Loading your dashboard…"}
      </span>
      {/* Inner wrapper so space-y never lands on the sr-only announce span */}
      <div className="space-y-6">
        {variant === "customer" ? <CustomerSkeleton /> : <StaffSkeleton />}
      </div>
    </div>
  );
}
