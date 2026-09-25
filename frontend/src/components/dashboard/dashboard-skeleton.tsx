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

/** Staff layout: page header, hero, 5 metric cards, chart + donut, activity + top, quick actions. */
function StaffSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <Bar className="size-12 shrink-0 rounded-xl" />
        <div className="space-y-2">
          <Bar className="h-6 w-32" />
          <Bar className="h-4 w-56" />
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="w-full max-w-xl space-y-3">
            <Bar className="h-6 w-32 bg-white/25" />
            <Bar className="h-8 w-48 bg-white/30" />
            <Bar className="h-4 w-full bg-white/20" />
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
            {[0, 1, 2].map((i) => (
              <Bar key={i} className="h-7 w-11 rounded-lg bg-white/25" />
            ))}
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <Bar className="size-11 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Bar className="h-4 w-32" />
              <Bar className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Customer layout: heading, CTA + 4 stat cards, two recent panels. */
function CustomerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bar className="h-6 w-40" />
        <Bar className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <Bar className="size-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bar className="h-4 w-48" />
            <Bar className="h-3 w-64" />
          </div>
        </div>
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
    </div>
  );
}

/**
 * Visual loading placeholder for both dashboards. Mirrors the real page
 * structure so the layout doesn't jump when the data arrives, and announces
 * itself to screen readers while the summary request is in flight.
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
      {variant === "customer" ? <CustomerSkeleton /> : <StaffSkeleton />}
    </div>
  );
}
