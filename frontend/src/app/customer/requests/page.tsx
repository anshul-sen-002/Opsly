"use client";

import { ClipboardList, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { JobStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ApiError, jobApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Job, Paged } from "@/types";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

function MyRequestsContent() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<Job> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await jobApi.myRequests(targetPage, PAGE_SIZE));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load]);

  const jobs = data?.content ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">My Requests</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            All service requests you have raised.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/customer/requests/new">
            <Button icon={<Plus className="size-4" />} size="md">
              New Request
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => void load(page)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(page)} />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No requests yet"
            description="Your service requests will appear here once you raise one."
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {jobs.map((job) => (
                <div key={job.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      #{job.id}
                      <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{job.description}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      Raised {formatDateTime(job.createdAt)}
                      {job.scheduledAt ? ` · Scheduled ${formatDateTime(job.scheduledAt)}` : ""}
                    </p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>
              ))}
            </div>
            {data && (
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6">
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  totalElements={data.totalElements}
                  pageSize={PAGE_SIZE}
                  onPageChange={(next) => void load(next)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MyRequestsPage() {
  return <MyRequestsContent />;
}
