"use client";

import {
  ArrowRight,
  CalendarClock,
  LayoutDashboard,
  Server,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { TopCustomers } from "@/components/dashboard/top-customers";
import { PageHeader } from "@/components/page-header";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { dashboardApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

import type { DashboardSummary } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { displayNameFromEmail } from "@/lib/utils";

const RANGES = [7, 14, 30] as const;

const QUICK_ACTIONS = [
  {
    href: "/users/new",
    label: "Add a team member",
    description: "Create an admin, manager or technician account.",
    icon: UserPlus,
  },
  {
    href: "/customers",
    label: "Browse customers",
    description: "Review and manage your customer directory.",
    icon: Server,
  },
  {
    href: "/tasks",
    label: "Review pending work",
    description: "Check jobs waiting for assignment.",
    icon: CalendarClock,
  },
];

export default function DashboardPage() {
  const [days, setDays] = useState<number>(7);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { user } = useAuth();

  // Show welcome toast on fresh login
  useEffect(() => {
    try {
      const showToast = localStorage.getItem('opsly.showWelcomeToast');
      if (showToast === 'true' && user) {
        localStorage.removeItem('opsly.showWelcomeToast');
        toast.success(
          `Welcome, ${displayNameFromEmail(user.email)}!`,
          "Signed in successfully — glad to have you back."
        );
      }
    } catch {
      // storage unavailable
    }
  }, [toast, user]);

  const load = useCallback(async (range: number) => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await dashboardApi.summary(range));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const totalJobs = summary?.stats.find((s) => s.key === "total_jobs")?.value ?? 0;
  const revenue = summary?.stats.find((s) => s.key === "monthly_revenue")?.value ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader icon={LayoutDashboard} title="Dashboard" subtitle="Overview of your service operations" />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-sm sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-indigo-50">
              <Sparkles className="size-3.5" /> Live operations
            </p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-100">
              {loading || !summary ? (
                "Loading live stats from your jobs, customers and payments…"
              ) : (
                <>
                  Team is tracking <span className="font-semibold text-white">{Math.round(totalJobs)} jobs</span>{" "}
                  with <span className="font-semibold text-white">{formatCurrency(revenue)}</span> collected this
                  month.
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1 backdrop-blur">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  days === r ? "bg-white text-indigo-700 shadow-sm" : "text-indigo-100 hover:bg-white/10"
                )}
              >
                {r}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !summary ? (
        <PageLoader />
      ) : error || !summary ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ErrorState title="Dashboard unavailable" message={error ?? undefined} onRetry={() => void load(days)} />
        </div>
      ) : (
        <>
          <MetricCards stats={summary.stats} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <OverviewChart overview={summary.overview} days={summary.days} />
            </div>
            <StatusDonut items={summary.statusCounts} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentActivity items={summary.recentActivity} />
            </div>
            <TopCustomers items={summary.topCustomers} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <action.icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{action.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{action.description}</span>
                </span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
