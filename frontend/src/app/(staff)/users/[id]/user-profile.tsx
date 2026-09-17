"use client";

import {
  Activity,
  ArrowRight,
  Ban,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  History,
  KeyRound,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCog,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Avatar } from "@/components/ui/avatar";
import { DeletedBadge, RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { ApiError, jobApi, staffApi, technicianApi, userProfileApi } from "@/lib/api";
import {
  cn,
  displayNameFromEmail,
  formatDateTime,
  formatLongDate,
} from "@/lib/utils";
import type { Job, Role, Staff } from "@/types";
import { useRoleChange, useUserActions } from "../user-actions";
import { InfoCard, InfoRow, JobRow, StatusToggle } from "../user-ui";
import { ProfileImageUpload } from "./profile-image-upload";

type TabId = "overview" | "personal" | "work" | "permissions" | "activity";

const PERMISSIONS: Record<
  Role,
  { label: string; allowed: boolean }[]
> = {
  ADMIN: [
    { label: "Create and manage all staff accounts", allowed: true },
    { label: "Full customer and technician management", allowed: true },
    { label: "Create, assign and close jobs", allowed: true },
    { label: "Manage invoices and payments", allowed: true },
    { label: "Delete and restore accounts", allowed: true },
  ],
  MANAGER: [
    { label: "Manage customers and technicians", allowed: true },
    { label: "Create and assign jobs", allowed: true },
    { label: "Close jobs, invoices and payments", allowed: true },
    { label: "Update technician accounts", allowed: true },
    {
      label: "Create admin accounts or manage admins",
      allowed: false,
    },
  ],
  TECHNICIAN: [
    { label: "View only the jobs assigned to them", allowed: true },
    { label: "Start and complete their own jobs", allowed: true },
    { label: "Assign jobs or close jobs", allowed: false },
    { label: "View other technicians' jobs", allowed: false },
  ],
  CUSTOMER: [
    {
      label: "Raise and track their own service requests",
      allowed: true,
    },
    { label: "View their own jobs and invoices", allowed: true },
    {
      label: "Manage staff or other customers",
      allowed: false,
    },
  ],
};

/** User profile page — header card, tabs, performance and quick actions */
export function UserProfile() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const params = useParams<{ id: string }>();

  const [user, setUser] = useState<Staff | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const actions = useUserActions(async (fresh) => setUser(fresh));
  const roleChange = useRoleChange(async (fresh) => setUser(fresh));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // If auth isn't settled yet, wait for it — don't call the API without
      // a reliable identity. The effect re-runs when currentUser changes.
      if (!currentUser) return;

      setLoading(true);
      setError(null);
      setJobs([]);

      try {
        const ownTechnician = currentUser.role === "TECHNICIAN" &&
          String(currentUser.userId) === params.id;
        const staff = ownTechnician
          ? await userProfileApi.me()
          : await staffApi.getById(params.id);
        if (cancelled) return;
        setUser(staff);

        if (ownTechnician) {
          const jobPage = await jobApi.myJobs(0, 100, "createdAt,desc");
          if (cancelled) return;
          setJobs(jobPage.content);
        } else if (currentUser.role !== "TECHNICIAN" && staff.role === "TECHNICIAN" && !staff.deleted) {
          const technicians = await technicianApi.list(0, 100, "name,asc");
          if (cancelled) return;
          const profile = technicians.content.find((t) => t.userId === staff.id);
          if (profile) {
            const jobPage = await jobApi.list(0, 100, "createdAt,desc");
            if (cancelled) return;
            setJobs(jobPage.content.filter((job) => job.technicianId === profile.id));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load user details."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.id, currentUser]);

  // Close the header menu on outside click
  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickAway);

    return () => {
      document.removeEventListener("mousedown", onClickAway);
    };
  }, []);

  if (loading) return <PageLoader />;

  if (error || !user) {
    return (
      <ErrorState
        title="Could not load user"
        message={error ?? undefined}
      />
    );
  }

    const isSelf = currentUser?.userId === user.id;
  const callerRole = currentUser?.role;
  // Admin manages staff accounts freely; a Manager may edit Technician profiles
  // (name, email, phone, specialization) — but never other staff/admin accounts.
  // Account-management actions (activate/deactivate/delete/restore/role-change)
  // stay ADMIN-only via `canManage`.
  const canManage = callerRole === "ADMIN";
  const canEditTechnician =
    callerRole === "MANAGER" && user.role === "TECHNICIAN" && !user.deleted && !isSelf;
  const canEdit =
    !user.deleted && (canManage || canEditTechnician || (callerRole === "TECHNICIAN" && isSelf));
  const isTechnician =
    user.role === "TECHNICIAN" && !user.deleted &&
    (currentUser?.role !== "TECHNICIAN" || isSelf);

  const displayName =
    user.name ?? displayNameFromEmail(user.email);

  const performance = {
    total: jobs.length,
    completed: jobs.filter(
      (j) =>
        j.status === "COMPLETED" ||
        j.status === "CLOSED"
    ).length,
    inProgress: jobs.filter(
      (j) => j.status === "IN_PROGRESS"
    ).length,
    pending: jobs.filter(
      (j) =>
        j.status === "PENDING" ||
        j.status === "ASSIGNED"
    ).length,
  };

  const recentJobs = jobs.slice(0, 4);
  const workJobs = jobs.slice(0, 10);

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "personal", label: "Personal Info" },
    ...(isTechnician
      ? [{ id: "work" as TabId, label: "Job & Work" }]
      : []),
    { id: "permissions", label: "Permissions" },
    { id: "activity", label: "Activity Log" },
  ];

  const activeTab = tabs.some(
    (item) => item.id === tab
  )
    ? tab
    : "overview";

  return (
    <div className="min-w-0 space-y-5">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400"
      >
        <Link
          href="/users"
          className="transition hover:text-slate-800 dark:hover:text-slate-200"
        >
          Users
        </Link>

        <ChevronRight className="size-3.5" />

        <span className="font-medium text-slate-700 dark:text-slate-200">
          User Profile
        </span>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          {isSelf ? (
            <ProfileImageUpload user={user} displayName={displayName} onUpdated={setUser} />
          ) : (
            <Avatar name={displayName} size="xl" className="size-20 text-2xl" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                {displayName}
              </h1>

              <RoleBadge role={user.role} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex min-w-0 max-w-full items-center gap-1.5">
                <Mail className="size-4 shrink-0" />

                <span className="min-w-0 break-all">
                  {user.email}
                </span>
              </span>

              {(user.phone || isTechnician) && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-4" />
                  {user.phone ?? "Not provided"}
                </span>
              )}

              {isTechnician && user.specialization && (
                <span className="flex items-center gap-1.5">
                  <Wrench className="size-4" />
                  {user.specialization}
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {user.deleted ? (
                <DeletedBadge />
              ) : (
                <StatusBadge status={user.status} />
              )}

              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30">
                Joined {formatLongDate(user.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {canEdit && <Link href={`/users/${user.id}/edit`}>
              <Button
                variant="outline"
                icon={<Pencil className="size-4" />}
              >
                Edit Profile
              </Button>
            </Link>}

            {canManage && <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                aria-label="More actions"
                onClick={() =>
                  setMenuOpen((open) => !open)
                }
                className="px-2"
              >
                <MoreVertical className="size-4" />
              </Button>

              {menuOpen && (
                <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-pop-in dark:border-slate-700 dark:bg-slate-900">
                  {user.deleted ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        actions.request("restore", user);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="size-4" />
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          actions.request(
                            user.status === "ACTIVE"
                              ? "deactivate"
                              : "activate",
                            user
                          );
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800",
                          user.status === "ACTIVE"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-600 dark:text-slate-300"
                        )}
                      >
                        {user.status === "ACTIVE" ? (
                          <Ban className="size-4" />
                        ) : (
                          <RotateCcw className="size-4" />
                        )}

                        {user.status === "ACTIVE"
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            actions.request("delete", user);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>}
          </div>
        </div>

        <div className="relative border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-1 overflow-x-auto px-2 scrollbar-hide">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "shrink-0 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-medium transition sm:px-4",
                  activeTab === item.id
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent dark:from-slate-900"
          />
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {activeTab === "overview" && (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <InfoCard icon={User} title="About">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Full Name">
                      {displayName}
                    </InfoRow>

                    <InfoRow label="Email">
                      {user.email}
                    </InfoRow>

                    <InfoRow label="Phone">
                      {user.phone ?? "Not provided"}
                    </InfoRow>

                    {isTechnician ? (
                      <InfoRow label="Specialization">
                        {user.specialization ?? "Not provided"}
                      </InfoRow>
                    ) : (
                      <InfoRow label="User ID">
                        {`USR-${user.id}`}
                      </InfoRow>
                    )}
                  </div>
                </InfoCard>

                <InfoCard icon={ShieldCheck} title="Role & Status">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Role">
                      <RoleBadge role={user.role} />
                    </InfoRow>

                    <InfoRow label="Status">
                      {user.deleted ? (
                        <DeletedBadge />
                      ) : (
                        <StatusBadge status={user.status} />
                      )}
                    </InfoRow>

                    <InfoRow label="Joined On">
                      {formatLongDate(user.createdAt)}
                    </InfoRow>

                    <InfoRow label="User ID">
                      {`USR-${user.id}`}
                    </InfoRow>

                    {user.deleted && user.deletedAt && (
                      <InfoRow label="Deleted On">
                        {formatDateTime(user.deletedAt)}
                      </InfoRow>
                    )}
                  </div>
                </InfoCard>
              </div>

              {isTechnician && (
                <InfoCard
                  icon={Sparkles}
                  title="Skills & Specializations"
                  action={
                    <Link
                      href={`/users/${user.id}/edit`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      Edit
                    </Link>
                  }
                >
                  {user.specialization ? (
                    <div className="flex flex-wrap gap-2">
                      {user.specialization
                        .split(/[,\n]/)
                        .map((skill) => skill.trim())
                        .filter(Boolean)
                        .map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30"
                          >
                            {skill}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No specializations added yet.
                    </p>
                  )}
                </InfoCard>
              )}

              <InfoCard
                icon={Briefcase}
                title="Recent Jobs"
                action={
                  isTechnician ? (
                    <Link
                      href="/jobs"
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      View all
                      <ArrowRight className="size-3.5" />
                    </Link>
                  ) : undefined
                }
              >
                {isTechnician ? (
                  recentJobs.length > 0 ? (
                    <div className="space-y-2">
                      {recentJobs.map((job) => (
                        <JobRow key={job.id} job={job} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No jobs assigned to this technician yet.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    This account doesn't perform field jobs —
                    administrative accounts manage operations.
                  </p>
                )}
              </InfoCard>
            </>
          )}

          {activeTab === "personal" && (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <InfoCard icon={User} title="Contact Information">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Full Name">
                      {displayName}
                    </InfoRow>

                    <InfoRow label="Email">
                      {user.email}
                    </InfoRow>

                    <InfoRow label="Phone">
                      {user.phone ?? "Not provided"}
                    </InfoRow>

                    <InfoRow label="User ID">
                      {`USR-${user.id}`}
                    </InfoRow>

                    {isTechnician && (
                      <InfoRow label="Specialization">
                        {user.specialization ?? "Not provided"}
                      </InfoRow>
                    )}
                  </div>
                </InfoCard>

                <InfoCard icon={ShieldCheck} title="Account">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Role">
                      <RoleBadge role={user.role} />
                    </InfoRow>

                    <InfoRow label="Status">
                      {user.deleted ? (
                        <DeletedBadge />
                      ) : (
                        <StatusBadge status={user.status} />
                      )}
                    </InfoRow>

                    <InfoRow label="Joined On">
                      {formatDateTime(user.createdAt)}
                    </InfoRow>

                    {user.deleted && user.deletedAt && (
                      <InfoRow label="Deleted On">
                        {formatDateTime(user.deletedAt)}
                      </InfoRow>
                    )}
                  </div>
                </InfoCard>
              </div>

              {canEdit && <div className="flex justify-end">
                <Link href={`/users/${user.id}/edit`}>
                  <Button icon={<Pencil className="size-4" />}>
                    Edit Profile
                  </Button>
                </Link>
              </div>}
            </>
          )}

          {activeTab === "work" && isTechnician && (
            <div className="grid gap-5 lg:grid-cols-2">
              <InfoCard icon={Activity} title="Performance">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Total Jobs",
                      value: performance.total,
                    },
                    {
                      label: "Completed",
                      value: performance.completed,
                    },
                    {
                      label: "In Progress",
                      value: performance.inProgress,
                    },
                    {
                      label: "Pending",
                      value: performance.pending,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl bg-slate-50 p-4 dark:bg-white/5"
                    >
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {stat.value}
                      </p>

                      <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </InfoCard>

              <InfoCard
                icon={Briefcase}
                title="Assigned Jobs"
                action={
                  <Link
                    href="/jobs"
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    View all
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              >
                {workJobs.length > 0 ? (
                  <div className="space-y-2">
                    {workJobs.map((job) => (
                      <JobRow key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No jobs assigned yet.
                  </p>
                )}
              </InfoCard>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <InfoCard icon={ShieldCheck} title="Role & Status">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoRow label="Role">
                    <RoleBadge role={user.role} />
                  </InfoRow>

                  <InfoRow label="Status">
                    {user.deleted ? (
                      <DeletedBadge />
                    ) : (
                      <StatusBadge status={user.status} />
                    )}
                  </InfoRow>

                  <InfoRow label="Joined On">
                    {formatLongDate(user.createdAt)}
                  </InfoRow>

                  <InfoRow label="User ID">
                    {`USR-${user.id}`}
                  </InfoRow>
                </div>
              </InfoCard>

              <InfoCard
                icon={CheckCircle2}
                title={`${user.role} permissions`}
              >
                <ul className="space-y-2.5">
                  {PERMISSIONS[user.role].map((permission) => (
                    <li
                      key={permission.label}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      {permission.allowed ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
                      )}

                      <span className="text-slate-600 dark:text-slate-300">
                        {permission.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <EmptyState
                icon={History}
                title="No activity recorded yet"
                description="Sign-ins, status changes and job events for this account will appear here."
              />
            </div>
          )}
        </div>

        <div className="space-y-5 xl:col-span-1 xl:self-start">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  user.deleted
                    ? "bg-slate-400"
                    : user.status === "ACTIVE"
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                )}
              />

              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {user.deleted
                  ? "Deleted"
                  : user.status === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Status
              </span>

              {canManage && <StatusToggle
                checked={
                  !user.deleted &&
                  user.status === "ACTIVE"
                }
                disabled={user.deleted}
                onChange={() =>
                  actions.request(
                    user.status === "ACTIVE"
                      ? "deactivate"
                      : "activate",
                    user
                  )
                }
              />}
            </div>
          </div>

          {isTechnician && (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="size-4" />
                Performance Overview
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">
                    {performance.total}
                  </p>
                  <p className="text-xs text-indigo-100">
                    Total Jobs
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold">
                    {performance.completed}
                  </p>
                  <p className="text-xs text-indigo-100">
                    Completed
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold">
                    {performance.inProgress}
                  </p>
                  <p className="text-xs text-indigo-100">
                    In Progress
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold">
                    {performance.pending}
                  </p>
                  <p className="text-xs text-indigo-100">
                    Pending
                  </p>
                </div>
              </div>
            </div>
          )}

          {canManage && <InfoCard icon={Zap} title="Quick Actions">
            <div className="space-y-1">
              <Link
                href={`/users/${user.id}/edit`}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
              >
                <Pencil className="size-4" />
                Edit User
              </Link>

              <button
                type="button"
                onClick={() => roleChange.openFor(user)}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
              >
                <UserCog className="size-4" />
                Change Role
              </button>

              <button
                type="button"
                onClick={() =>
                  toast.info(
                    "Not available yet",
                    "Password reset isn't wired to the backend yet."
                  )
                }
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
              >
                <KeyRound className="size-4" />
                Reset Password
              </button>

              {user.deleted ? (
                <button
                  type="button"
                  onClick={() =>
                    actions.request("restore", user)
                  }
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                >
                  <RotateCcw className="size-4" />
                  Restore User
                </button>
              ) : user.status === "ACTIVE" ? (
                <button
                  type="button"
                  onClick={() =>
                    actions.request("deactivate", user)
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <Ban className="size-4" />
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    actions.request("activate", user)
                  }
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                >
                  <RotateCcw className="size-4" />
                  Activate
                </button>
              )}

              {!user.deleted && !isSelf && (
                <button
                  type="button"
                  onClick={() =>
                    actions.request("delete", user)
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              )}
            </div>
          </InfoCard>}
        </div>
      </div>

      {canManage && actions.dialog}
      {canManage && roleChange.dialog}
    </div>
  );
}
