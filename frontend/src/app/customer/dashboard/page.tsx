"use client";

import { Activity, ArrowRight, ClipboardList, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { InvoiceStatusBadge, JobStatusBadge } from "@/components/ui/badge";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { ApiError, invoiceApi, jobApi } from "@/lib/api";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import type { Invoice, Job } from "@/types";
import type { LucideIcon } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { displayNameFromEmail } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", accent)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function CustomerDashboardContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobPage, invoicePage] = await Promise.all([
        jobApi.myRequests(0, 50),
        invoiceApi.myInvoices(0, 50).catch(() => null),
      ]);
      setJobs(jobPage.content);
      setInvoices(invoicePage?.content ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader />;

  if (error) {
    return <ErrorState title="Could not load dashboard" message={error} onRetry={() => void load()} />;
  }

  const inProgress = jobs.filter((job) => job.status === "IN_PROGRESS" || job.status === "ASSIGNED").length;
  const completed = jobs.filter((job) => job.status === "COMPLETED" || job.status === "CLOSED").length;
  const outstanding = invoices
    .filter((invoice) => invoice.status !== "DRAFT")
    .reduce((sum, invoice) => sum + Math.max(invoice.totalAmount - invoice.paidAmount, 0), 0);

  const recentJobs = jobs.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track your service requests and invoices in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* CTA Card - spans full width above stat cards */}
        <Link
          href="/customer/requests/new"
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40 sm:col-span-4"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <ClipboardList className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">Raise a new service request</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">Describe the work and schedule a visit</span>
          </span>
          <ArrowRight className="ml-auto size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
        </Link>

        <StatCard
          icon={ClipboardList}
          label="Total Requests"
          value={jobs.length}
          accent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
        />
        <StatCard
          icon={Activity}
          label="In Progress"
          value={inProgress}
          accent="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <StatCard
          icon={Receipt}
          label="Completed"
          value={completed}
          accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <StatCard
          icon={Wallet}
          label="Outstanding"
          value={formatCurrency(outstanding)}
          accent="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ClipboardList className="size-4 text-indigo-500 dark:text-indigo-400" />
              Recent Requests
            </h2>
            <Link
              href="/customer/requests"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </header>
          <div className="p-5">
            {recentJobs.length > 0 ? (
              <div className="space-y-2">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        #{job.id}
                        <span className="ml-2 font-normal text-xs text-slate-500 dark:text-slate-400">
                          {job.description}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        {formatDateTime(job.createdAt)}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No service requests yet — they will appear here once you raise one.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Receipt className="size-4 text-indigo-500 dark:text-indigo-400" />
              Recent Invoices
            </h2>
            <Link
              href="/customer/invoices"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </header>
          <div className="p-5">
            {recentInvoices.length > 0 ? (
              <div className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {invoice.invoiceNumber}
                        <span className="ml-2 font-normal text-xs text-slate-500 dark:text-slate-400">
                          {formatCurrency(invoice.totalAmount)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        {invoice.issuedAt ? formatDateTime(invoice.issuedAt) : "Not issued yet"}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No invoices yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function CustomerDashboardPage() {
  return <CustomerDashboardContent />;
}
