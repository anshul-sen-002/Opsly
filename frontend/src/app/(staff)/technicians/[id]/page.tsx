"use client";

import { Briefcase, CalendarDays, Mail, Phone, User, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ErrorState, ProfileSkeleton } from "@/components/ui/states";
import { ApiError, jobApi, technicianApi } from "@/lib/api";
import { formatLongDate } from "@/lib/utils";
import type { Job, Technician } from "@/types";
import { InfoCard, InfoRow, JobRow } from "../../users/user-ui";

function TechnicianDetailPageContent() {
  const params = useParams<{ id: string }>();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await technicianApi.getById(params.id);
      const jobPage = await jobApi.list(0, 100, "createdAt,desc");
      setTechnician(data);
      setJobs(jobPage.content.filter((job) => job.technicianId === data.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load technician.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ProfileSkeleton label="Loading technician" showTabs={false} />;

  if (error || !technician) {
    return <ErrorState title="Could not load technician" message={error ?? undefined} onRetry={() => void load()} />;
  }

  const performance = {
    total: jobs.length,
    completed: jobs.filter((job) => job.status === "COMPLETED" || job.status === "CLOSED").length,
    inProgress: jobs.filter((job) => job.status === "IN_PROGRESS").length,
    pending: jobs.filter((job) => job.status === "PENDING" || job.status === "ASSIGNED").length,
  };
  const recentJobs = jobs.slice(0, 6);

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/technicians" className="transition hover:text-slate-800 dark:hover:text-slate-200">
          Technicians
        </Link>
        <span className="font-medium text-slate-700 dark:text-slate-200">/ {technician.name}</span>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar name={technician.name} size="xl" className="size-20 text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{technician.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mail className="size-4" />
                {technician.email}
              </span>
              {technician.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-4" />
                  {technician.phone}
                </span>
              )}
              {technician.specialization && (
                <span className="flex items-center gap-1.5">
                  <Wrench className="size-4" />
                  {technician.specialization}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30">
                Joined {formatLongDate(technician.createdAt)}
              </span>
            </div>
          </div>
          <Link href={`/users/${technician.userId}`}>
            <Button variant="outline" icon={<User className="size-4" />}>
              View User Account
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <InfoCard icon={User} title="Profile">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Name">{technician.name}</InfoRow>
            <InfoRow label="Email">{technician.email}</InfoRow>
            <InfoRow label="Phone">{technician.phone ?? "Not provided"}</InfoRow>
            <InfoRow label="Specialization">{technician.specialization ?? "Not provided"}</InfoRow>
            <InfoRow label="Technician ID">{`TEC-${technician.id}`}</InfoRow>
            <InfoRow label="Joined On">{formatLongDate(technician.createdAt)}</InfoRow>
          </div>
          <div className="mt-4 flex justify-end">
            <Link href={`/users/${technician.userId}/edit`}>
              <Button variant="outline" size="sm">
                Edit via user account
              </Button>
            </Link>
          </div>
        </InfoCard>

        <InfoCard icon={Briefcase} title="Workload">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Total Jobs", value: performance.total },
              { label: "Completed", value: performance.completed },
              { label: "In Progress", value: performance.inProgress },
              { label: "Pending", value: performance.pending },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      <InfoCard
        icon={CalendarDays}
        title="Recent Jobs"
        action={
          <Link href="/jobs" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            View all
          </Link>
        }
      >
        {recentJobs.length > 0 ? (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No jobs assigned to this technician yet.</p>
        )}
      </InfoCard>
    </div>
  );
}

export default function TechnicianDetailPage() {
  return <TechnicianDetailPageContent />;
}
