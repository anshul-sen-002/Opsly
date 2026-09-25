import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-indigo-600", className)} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}

/** Rendered in <head> before hydration to apply the saved theme without flash */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('opsly-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="size-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

/** Shared shimmer block used by the page-level skeletons. */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded bg-slate-200 dark:bg-slate-800", className)}
    />
  );
}

/** Panel shell matching the shared `InfoCard` layout on detail screens. */
function InfoCardSkeleton({ fields = 6, className }: { fields?: number; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Loading placeholder for profile-style detail screens (staff user profile,
 * customer detail, customer portal profile, technician detail). Mirrors the
 * breadcrumb → header card → tabs → info-card structure so the layout does
 * not jump when the data arrives.
 */
export function ProfileSkeleton({
  label = "Loading profile",
  showTabs = true,
}: {
  label?: string;
  showTabs?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-testid="profile-skeleton"
      className="min-w-0 space-y-5"
    >
      <span className="sr-only">{label}…</span>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="size-3 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>

      {/* Header card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          </div>
          <Skeleton className="hidden h-9 w-36 rounded-lg sm:block" />
        </div>

        {showTabs && (
          <div
            data-testid="profile-skeleton-tabs"
            className="flex gap-4 border-t border-slate-100 px-4 py-3 dark:border-slate-800"
          >
            {["w-20", "w-28", "w-24", "w-28", "w-20"].map((width, index) => (
              <Skeleton key={index} className={`h-4 ${width}`} />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <InfoCardSkeleton />
        <InfoCardSkeleton />
      </div>
      <InfoCardSkeleton fields={4} />
    </div>
  );
}

/**
 * Loading placeholder for entity detail screens (job, invoice): back link,
 * header card with status/actions, and stacked info cards.
 */
export function DetailSkeleton({ label = "Loading details" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-testid="detail-skeleton"
      className="space-y-5"
    >
      <span className="sr-only">{label}…</span>

      <Skeleton className="h-4 w-28" />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3.5">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-4 w-44 max-w-full" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="hidden h-9 w-24 rounded-lg sm:block" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-6">
          {["w-20", "w-24", "w-20", "w-28"].map((width, index) => (
            <Skeleton key={index} className={`h-7 rounded-full ${width}`} />
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <InfoCardSkeleton />
        <InfoCardSkeleton />
      </div>
      <InfoCardSkeleton fields={8} />
    </div>
  );
}

/**
 * Loading placeholder for add/edit screens built on `EntityFormShell` —
 * back link, gradient banner, section heading, 2-col field grid and footer.
 */
export function FormSkeleton({
  label = "Loading form",
  fields = 6,
}: {
  label?: string;
  fields?: number;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-testid="form-skeleton"
      className="mx-auto w-full max-w-4xl"
    >
      <span className="sr-only">{label}…</span>

      {/* Back link */}
      <Skeleton className="h-4 w-32" />

      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-24px_rgba(79,70,229,0.25)] dark:border-white/10 dark:bg-[#0b1330] dark:shadow-black/40">
        {/* Banner */}
        <div className="relative overflow-hidden px-5 pb-5 pt-5 sm:px-8 sm:pb-6 sm:pt-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,#eef2ff_0%,#f5f7ff_45%,#ffffff_100%)] dark:bg-[radial-gradient(120%_140%_at_0%_0%,rgba(99,102,241,0.18)_0%,rgba(99,102,241,0.06)_45%,transparent_100%)]"
          />
          <div className="relative flex items-start gap-4">
            <Skeleton className="size-14 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <Skeleton className="h-7 w-56 max-w-full" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </div>
        </div>

        {/* Section heading + fields */}
        <div className="px-4 sm:px-7">
          <div className="mt-6 flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 py-5 sm:grid-cols-2">
            {Array.from({ length: fields }).map((_, index) => (
              <div key={index} data-testid="form-skeleton-field" className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row sm:px-7 sm:py-5">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon className="size-7" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
        <AlertTriangle className="size-7" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <RefreshCw className="size-4" />
          Try again
        </button>
      )}
    </div>
  );
}
