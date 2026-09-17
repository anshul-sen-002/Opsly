"use client";

import {
  Calendar,
  ChevronDown,
  Expand,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { DeletedBadge, RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Pagination } from "@/components/ui/pagination";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { StatCards, growthSub, type StatCardItem } from "@/components/ui/stat-cards";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ApiError, staffApi } from "@/lib/api";
import { cn, displayNameFromEmail, formatLongDate, formatTime } from "@/lib/utils";
import type { Staff } from "@/types";
import { useUserActions } from "./user-actions";

const PAGE_SIZE = 10;
const FETCH_SIZE = 100;

type RoleChip = "all" | "ADMIN" | "MANAGER" | "TECHNICIAN" | "deleted";
type StatusFilter = "all" | "ACTIVE" | "INACTIVE";
type SortKey = "newest" | "oldest" | "name";

/** Display name — the User entity stores no name, so fall back to the email */
const nameOf = (user: Staff) => user.name ?? displayNameFromEmail(user.email);

/** Month-over-month signup growth, computed from account createdAt dates */
function growthOf(users: Staff[]): { arrow: "up" | "down" | "flat"; label: string } {
  const now = new Date();
  const created = (u: Staff) => new Date(u.createdAt);
  const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const thisMonth = users.filter((u) => created(u) >= monthStart(now)).length;
  const lastStart = monthStart(now);
  lastStart.setMonth(lastStart.getMonth() - 1);
  const lastMonth = users.filter((u) => {
    const c = created(u);
    return c >= lastStart && c < monthStart(now);
  }).length;
  if (lastMonth === 0 && thisMonth === 0) return { arrow: "flat", label: "No change from last month" };
  if (lastMonth === 0) return { arrow: "up", label: `${thisMonth} new this month` };
  const percent = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  if (percent === 0) return { arrow: "flat", label: "No change from last month" };
  return percent > 0
    ? { arrow: "up", label: `${percent}% from last month` }
    : { arrow: "down", label: `${Math.abs(percent)}% from last month` };
}

/** Mobile card for one user — avatar header, compact detail rows, action bar */
function UserMobileCard({
  user,
  deletedRow,
  onRestore,
}: {
  user: Staff;
  deletedRow: boolean;
  onRestore: (user: Staff) => void;
}) {
  const name = nameOf(user);
  return (
    <>
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} imageUrl={user.profileImageUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-5 text-slate-900 dark:text-white">{name}</p>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {user.deleted ? <DeletedBadge /> : <StatusBadge status={user.status} />}
        </div>
      </div>
      <dl className="space-y-2 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-slate-400 dark:text-slate-500">Role</dt>
          <dd>
            <RoleBadge role={user.role} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-slate-400 dark:text-slate-500">Phone</dt>
          <dd className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{user.phone ?? "—"}</dd>
        </div>
        {!deletedRow && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-slate-400 dark:text-slate-500">Created</dt>
            <dd className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
              {formatLongDate(user.createdAt)}
            </dd>
          </div>
        )}
      </dl>
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50/70 px-3 py-2 dark:bg-indigo-500/10">
          {deletedRow ? (
            <button
              type="button"
              onClick={() => onRestore(user)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            >
              <RotateCcw className="size-4" />
              Restore
            </button>
          ) : (
            <Link
              href={`/users/${user.id}`}
              aria-label={`View details for ${name}`}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            >
              <Expand className="size-4" />
              View Details
            </Link>
          )}
        </div>
      </div>
    </>
  );
}


/** Users list page — metric cards, role chips, filters, table with row actions */
export function UsersList() {
  const { user: currentUser } = useAuth();
  const canManage = currentUser?.role === "ADMIN";
  const canViewActions = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";
  const [allUsers, setAllUsers] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleChip, setRoleChip] = useState<RoleChip>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const actions = useUserActions(() => load());

  // The staff endpoint has no role/search filters, so every page is fetched once
  // and filtering runs client-side — keeps the chip counts and search exact.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collected: Staff[] = [];
      let current = await staffApi.list(0, FETCH_SIZE, "createdAt,desc");
      collected.push(...current.content);
      for (let p = 1; p < current.totalPages; p++) {
        const next = await staffApi.list(p, FETCH_SIZE, "createdAt,desc");
        collected.push(...next.content);
      }
      setAllUsers(collected);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Close the Filters popover on outside click
  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const counts = useMemo(
    () => ({
      all: allUsers.filter((u) => !u.deleted).length,
      ADMIN: allUsers.filter((u) => !u.deleted && u.role === "ADMIN").length,
      MANAGER: allUsers.filter((u) => !u.deleted && u.role === "MANAGER").length,
      TECHNICIAN: allUsers.filter((u) => !u.deleted && u.role === "TECHNICIAN").length,
      deleted: allUsers.filter((u) => u.deleted).length,
      active: allUsers.filter((u) => !u.deleted && u.status === "ACTIVE").length,
    }),
    [allUsers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = allUsers;
    if (roleChip === "deleted") {
      rows = rows.filter((u) => u.deleted);
    } else {
      rows = rows.filter((u) => !u.deleted);
      if (roleChip !== "all") rows = rows.filter((u) => u.role === roleChip);
      if (statusFilter !== "all") rows = rows.filter((u) => u.status === statusFilter);
    }
    if (q) {
      rows = rows.filter((u) => [u.email, u.name, u.phone].some((v) => v?.toLowerCase().includes(q)));
    }
    const sorted = [...rows];
    if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "oldest") sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else sorted.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    return sorted;
  }, [allUsers, roleChip, statusFilter, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const stats: StatCardItem[] = [
    { key: "total", label: "Total Users", value: counts.all, icon: Users, tone: "violet", ...growthSub(growthOf(allUsers.filter((u) => !u.deleted))) },
    { key: "technicians", label: "Technicians", value: counts.TECHNICIAN, icon: Wrench, tone: "blue", ...growthSub(growthOf(allUsers.filter((u) => !u.deleted && u.role === "TECHNICIAN"))) },
    { key: "managers", label: "Managers", value: counts.MANAGER, icon: UserCog, tone: "indigo", ...growthSub(growthOf(allUsers.filter((u) => !u.deleted && u.role === "MANAGER"))) },
    { key: "admins", label: "Admins", value: counts.ADMIN, icon: ShieldCheck, tone: "amber", ...growthSub(growthOf(allUsers.filter((u) => !u.deleted && u.role === "ADMIN"))) },
    { key: "active", label: "Active", value: counts.active, icon: UserCheck, tone: "emerald", sub: `${counts.all ? Math.round((counts.active / counts.all) * 100) : 0}% of all users`, progress: counts.all ? Math.round((counts.active / counts.all) * 100) : 0 },
  ];

  const clearFilters = () => {
    setStatusFilter("all");
    setQuery("");
    setPage(0);
  };

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (query.trim() ? 1 : 0);

  const chipOptions = [
    { value: "all" as RoleChip, label: "All", icon: Users, count: counts.all },
    { value: "ADMIN" as RoleChip, label: "Admin", icon: ShieldCheck, count: counts.ADMIN },
    { value: "MANAGER" as RoleChip, label: "Manager", icon: UserCog, count: counts.MANAGER },
    { value: "TECHNICIAN" as RoleChip, label: "Technician", icon: Wrench, count: counts.TECHNICIAN },
    { value: "deleted" as RoleChip, label: "Deleted", icon: Trash2, count: counts.deleted },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="Users"
        subtitle="Manage all system users and their access permissions."
        actions={
          <>
            <Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>
              Refresh
            </Button>
            {canManage && <Link href="/users/new">
              <Button icon={<UserPlus className="size-4" />}>Add User</Button>
            </Link>}
          </>
        }
      />

      {loading && allUsers.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[136px] animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <StatCards items={stats} />
      )}
      
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto scrollbar-hide pb-2 sm:pb-0">
            <FilterTabs<RoleChip>
              value={roleChip}
              options={chipOptions}
              onChange={(value) => {
                setRoleChip(value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <div className="relative" ref={filtersRef}>
              <Button variant="outline" icon={<SlidersHorizontal className="size-4" />} onClick={() => setFiltersOpen((open) => !open)} className="shrink-0 sm:justify-center">
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {filtersOpen && (
                <div className="absolute right-0 top-11 z-30 w-[min(92vw,320px)] max-h-[80vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl animate-pop-in dark:border-slate-700 dark:bg-slate-900 sm:left-auto sm:right-0">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Search</label>
                  <div className="relative mt-1.5">
                    <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setPage(0);
                      }}
                      placeholder="Name, email or phone"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
                    />
                  </div>
                  <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</p>
                  <div className="mt-1.5 flex gap-1.5">
                    {(["all", "ACTIVE", "INACTIVE"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={statusFilter === status}
                        onClick={() => {
                          setStatusFilter(status);
                          setPage(0);
                        }}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                          statusFilter === status
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                        )}
                      >
                        {status === "all" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearFilters} className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as SortKey);
                  setPage(0);
                }}
                aria-label="Sort users"
                className="h-[38px] appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A–Z)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {loading && allUsers.length === 0 ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={roleChip === "deleted" ? "No deleted users" : "No users match"}
            description={
              roleChip === "deleted"
                ? "Deleted accounts move here and can be restored anytime."
                : "Try a different filter or clear the search."
            }
          />
        ) : (
          <>
            <ResponsiveTable
              rows={pageRows}
              rowKey="id"
              columns={[
                {
                  header: "User",
                  accessor: (user) => {
                    const name = nameOf(user);
                    return (
                      <div className="flex items-center gap-3">
                        <Avatar name={name} imageUrl={user.profileImageUrl} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
                          <p className="truncate text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    );
                  },
                  primaryMobile: true,
                },
                {
                  header: "Role",
                  accessor: (user) => <RoleBadge role={user.role} />,
                },
                {
                  header: "Status",
                  accessor: (user) => (user.deleted ? <DeletedBadge /> : <StatusBadge status={user.status} />),
                },
                {
                  header: "Phone",
                  accessor: (user) => (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <Phone className="size-3.5 shrink-0 text-slate-400" />
                      {user.phone ?? "—"}
                    </span>
                  ),
                },
                {
                  header: "Created",
                  accessor: (user) => (
                    <span className="inline-flex items-start gap-1.5">
                      <Calendar className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                      <span>
                        <p className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{formatLongDate(user.createdAt)}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{formatTime(user.createdAt)}</p>
                      </span>
                    </span>
                  ),
                  hideOnMobile: roleChip === "deleted",
                },
              ]}
              actions={canViewActions ? (user) => {
                const name = nameOf(user);
                return roleChip === "deleted" ? (
                  <Button
                    variant="soft-danger"
                    size="sm"
                    icon={<RotateCcw className="size-4" />}
                    onClick={() => actions.request("restore", user)}
                  >
                    Restore
                  </Button>
                ) : (
                  <Link
                    href={`/users/${user.id}`}
                    aria-label={`View details for ${name}`}
                    title="View details"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                  >
                    <Expand className="size-4" />
                  </Link>
                );
              } : undefined}
              renderMobileCard={canViewActions ? (user) => (
                <UserMobileCard
                  user={user}
                  deletedRow={roleChip === "deleted"}
                  onRestore={(target) => actions.request("restore", target)}
                />
              ) : undefined}
            />
            <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalElements={filtered.length}
                pageSize={PAGE_SIZE}
                label="users"
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>



      {actions.dialog}
    </div>
  );
}
