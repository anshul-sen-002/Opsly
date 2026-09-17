"use client";

import { ArrowLeft, CalendarClock, Hash, User, UserCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { JobStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { ApiError, jobApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Job } from "@/types";
import { useJobActions } from "../job-actions";

const LIFECYCLE = ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED"] as const;

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const isTechnician = user?.role === "TECHNICIAN";
  const isManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJob(await jobApi.getById(params.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load this job.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const actions = useJobActions(load);

  if (loading) return <PageLoader />;
  if (error || !job) {
    return <ErrorState title="Could not load job" message={error ?? undefined} onRetry={() => void load()} />;
  }

  const currentStep = LIFECYCLE.indexOf(job.status);

  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="size-4" />
        Back to jobs
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Wrench className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                Job #{job.id}
                <JobStatusBadge status={job.status} />
              </h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{job.customerName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isManager && job.status === "PENDING" && (
              <Button
                variant="outline"
                size="sm"
                icon={<UserCheck className="size-4" />}
                onClick={() => actions.requestAssign(job)}
              >
                Assign
              </Button>
            )}
            {isTechnician && job.status === "ASSIGNED" && (
              <Button size="sm" onClick={() => actions.request("start", job)}>
                Start job
              </Button>
            )}
            {isTechnician && job.status === "IN_PROGRESS" && (
              <Button size="sm" onClick={() => actions.request("complete", job)}>
                Mark complete
              </Button>
            )}
            {isManager && job.status === "COMPLETED" && (
              <Button variant="soft-danger" size="sm" onClick={() => actions.request("close", job)}>
                Close job
              </Button>
            )}
            {isManager && job.status === "CLOSED" && (
              <Link href={`/invoices/new?jobId=${job.id}`}>
                <Button size="sm">Create invoice</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <ol className="flex flex-wrap items-center gap-2">
            {LIFECYCLE.map((step, index) => {
              const done = index < currentStep;
              const active = index === currentStep;
              return (
                <li key={step} className="flex items-center gap-2">
                  <span
                    className={
                      "rounded-full px-3 py-1.5 text-xs font-medium " +
                      (active
                        ? "bg-indigo-600 text-white"
                        : done
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500")
                    }
                  >
                    {step.replace(/_/g, " ")}
                  </span>
                  {index < LIFECYCLE.length - 1 && (
                    <span className="h-px w-3 bg-slate-200 dark:bg-slate-700 sm:w-6" aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {actions.dialog}
    </div>
  );
}