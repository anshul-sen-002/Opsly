"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { JobStatusBadge } from "@/components/ui/badge";
import { cn, formatLongDate, formatTime } from "@/lib/utils";
import type { Job } from "@/types";

/** Card with icon + title header — shared by the user profile tabs */
export function InfoCard({
  icon: Icon,
  title,
  action,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Icon className="size-4 text-indigo-500 dark:text-indigo-400" />
          {title}
        </h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Label above value — mirrors the reference profile cards */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-white">{children}</p>
    </div>
  );
}

/** Recent-job row used on the profile page (#JOB-1028 · AC Repair style) */
export function JobRow({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          #JOB-{job.id}
          <span className="font-normal text-slate-500 dark:text-slate-400"> · {job.customerName}</span>
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{job.description}</p>
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
          {formatLongDate(job.createdAt)} · {formatTime(job.createdAt)}
        </p>
      </div>
      <JobStatusBadge status={job.status} />
    </Link>
  );
}

/** iOS-style switch used by the profile status card */
export function StatusToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Deactivate account" : "Activate account"}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
      )}
    >
      <span
        className={cn(
          "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}