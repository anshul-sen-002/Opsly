"use client";

import { Plus, RefreshCw, Wrench } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { JobStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ResponsiveTable, type Column } from "@/components/ui/responsive-table";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ApiError, jobApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Job, JobStatus, Paged } from "@/types";
import { useJobActions } from "./job-actions";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: JobStatus[] = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CLOSED",
];

/** Sentinel for the "All statuses" filter option */
const ALL = "ALL";

function JobsPageContent() {
  const { user } = useAuth();
  const isTechnician = user?.role === "TECHNICIAN";
  const isManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<Job> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actions = useJobActions(() => load(page, status));

  const load = useCallback(
    async (targetPage: number, targetStatus: string) => {
      setLoading(true);
      setError(null);
      try {
        // TECHNICIAN: the backend derives identity from the JWT (own jobs only)
        setData(
          isTechnician
            ? await jobApi.myJobs(targetPage, PAGE_SIZE)
            : await jobApi.list(
                targetPage,
                PAGE_SIZE,
                "createdAt,desc",
                targetStatus === ALL ? undefined : (targetStatus as JobStatus)
              )
        );
        setPage(targetPage);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    },
    [isTechnician]
  );

  useEffect(() => {
    void load(0, status);
  }, [load, status]);

  const jobs = data?.content ?? [];

  const columns: Column<Job>[] = [
    {
      header: "Job",
      accessor: (job) => (
        <div className="min-w-0">
          <Link
            href={`/jobs/${job.id}`}
            className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
          >
            #{job.id}
          </Link>
          <p className="line-clamp-2 text-xs text-slate-400">{job.description}</p>
        </div>
      ),
    },
    { header: "Customer", accessor: (job) => job.customerName },
    { header: "Technician", accessor: (job) => job.technicianName ?? "Unassigned" },
    { header: "Status", accessor: (job) => <JobStatusBadge status={job.status} /> },
    {
      header: "Scheduled",
      accessor: (job) => (job.scheduledAt ? formatDate(job.scheduledAt) : "-"),
    },
  ];

  const renderActions = (job: Job) => (
    <>
      {isManager && job.status === "PENDING" && (
        <Button variant="outline" size="sm" onClick={() => actions.requestAssign(job)}>
          Assign
        </Button>
      )}
      {isTechnician && job.status === "ASSIGNED" && (
        <Button variant="outline" size="sm" onClick={() => actions.request("start", job)}>
          Start
        </Button>
      )}
      {isTechnician && job.status === "IN_PROGRESS" && (
        <Button variant="outline" size="sm" onClick={() => actions.request("complete", job)}>
          Complete
        </Button>
      )}
      {isManager && job.status === "COMPLETED" && (
        <Button variant="soft-danger" size="sm" onClick={() => actions.request("close", job)}>
          Close
        </Button>
      )}
      <Link href={`/jobs/${job.id}`}>
        <Button variant="ghost" size="sm">
          View
        </Button>
      </Link>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wrench}
        title={isTechnician ? "My Jobs" : "Jobs"}
        subtitle={
          isTechnician
            ? "Jobs assigned to you - start and complete them here"
            : "Service requests from creation through to completion"
        }
        actions={
          <>
            <Button
              variant="outline"
              icon={<RefreshCw className="size-4" />}
              onClick={() => void load(page, status)}
            >
              Refresh
            </Button>
            {isManager && (
              <Link href="/jobs/new">
                <Button icon={<Plus className="size-4" />}>New Job</Button>
              </Link>
            )}
          </>
        }
      />

      {!isTechnician && (
        <div className="max-w-xs">
          <Select
            label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value={ALL}>All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(page, status)} />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={isTechnician ? "No jobs assigned" : "No jobs yet"}
            description={
              isTechnician
                ? "Once a manager assigns work to you it will show up here."
                : "Create the first job to start tracking service work."
            }
          />
        ) : (
          <>
            <ResponsiveTable columns={columns} rows={jobs} rowKey="id" actions={renderActions} />
            {data && (
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6">
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  totalElements={data.totalElements}
                  pageSize={PAGE_SIZE}
                  label="jobs"
                  onPageChange={(next) => void load(next, status)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {actions.dialog}
    </div>
  );
}

export default function JobsPage() {
  return <JobsPageContent />;
}
