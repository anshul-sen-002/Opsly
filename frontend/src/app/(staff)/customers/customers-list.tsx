"use client";

import {
  Briefcase,
  Calendar,
  ChevronDown,
  Eye,
  KeyRound,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, DeletedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Pagination } from "@/components/ui/pagination";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { StatCards, growthSub, type StatCardItem } from "@/components/ui/stat-cards";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ApiError, customerApi } from "@/lib/api";
import { cn, formatLongDate, formatTime } from "@/lib/utils";
import { useCustomerActions } from "./customer-actions";
import { GrantAccessDialog } from "./grant-access-dialog";
import type { Customer } from "@/types";

const PAGE_SIZE = 10;
const FETCH_SIZE = 100;

type CustomerChip = "all" | "login" | "no-login" | "business" | "deleted";
type SortKey = "newest" | "oldest" | "name";

/** Month-over-month signup growth, computed from customer createdAt dates */
function growthOf(customers: Customer[]): { arrow: "up" | "down" | "flat"; label: string } {
  const now = new Date();
  const created = (c: Customer) => new Date(c.createdAt);
  const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const thisMonth = customers.filter((c) => created(c) >= monthStart(now)).length;
  const lastStart = monthStart(now);
  lastStart.setMonth(lastStart.getMonth() - 1);
  const lastMonth = customers.filter((c) => {
    const d = created(c);
    return d >= lastStart && d < monthStart(now);
  }).length;
  if (lastMonth === 0 && thisMonth === 0) return { arrow: "flat", label: "No change from last month" };
  if (lastMonth === 0) return { arrow: "up", label: `${thisMonth} new this month` };
  const percent = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  if (percent === 0) return { arrow: "flat", label: "No change from last month" };
  return percent > 0
    ? { arrow: "up", label: `${percent}% from last month` }
    : { arrow: "down", label: `${Math.abs(percent)}% from last month` };
}

/** Portal access state as a badge — mirrors the users list status column */
function PortalBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge color={enabled ? "emerald" : "slate"}>
      <span className={cn("size-1.5 rounded-full", enabled ? "bg-emerald-500" : "bg-slate-400")} />
      {enabled ? "Login enabled" : "No login"}
    </Badge>
  );
}

/** Mobile card for one customer — avatar header, compact detail rows, action bar */
function CustomerMobileCard({
  customer,
  deletedRow,
  onRestore,
  onGrant,
}: {
  customer: Customer;
  deletedRow: boolean;
  onRestore: (customer: Customer) => void;
  onGrant: (customer: Customer) => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={customer.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-5 text-slate-900 dark:text-white">
              {customer.name}
            </p>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {customer.email ?? customer.phone}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {customer.deleted ? <DeletedBadge /> : <PortalBadge enabled={customer.hasLoginAccount} />}
        </div>
      </div>
      <dl className="space-y-2 px-4 py-3">
        {customer.companyName && (
          <div className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-xs text-slate-400 dark:text-slate-500">Company</dt>
            <dd className="min-w-0 truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">
              {customer.companyName}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-slate-400 dark:text-slate-500">Phone</dt>
          <dd className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{customer.phone}</dd>
        </div>
        {customer.email && (
          <div className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-xs text-slate-400 dark:text-slate-500">Email</dt>
            <dd className="min-w-0 truncate text-[13px] font-medium text-slate-700 dark:text-slate-200" title={customer.email}>
              {customer.email}
            </dd>
          </div>
        )}
        {customer.city && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-slate-400 dark:text-slate-500">City</dt>
            <dd className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{customer.city}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
            {deletedRow ? "Deleted On" : "Created"}
          </dt>
          <dd className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
            {formatLongDate(deletedRow && customer.deletedAt ? customer.deletedAt : customer.createdAt)}
          </dd>
        </div>
      </dl>
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center justify-center gap-1 rounded-xl bg-indigo-50/70 px-2 py-2 dark:bg-indigo-500/10">
          <Link
            href={`/customers/${customer.id}`}
            aria-label={`View ${customer.name}`}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
          >
            <Eye className="size-4" />
            View Details
          </Link>
          {deletedRow ? (
            <button
              type="button"
              onClick={() => onRestore(customer)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            >
              <RotateCcw className="size-4" />
              Restore
            </button>
          ) : (
            !customer.hasLoginAccount && (
              <button
                type="button"
                onClick={() => onGrant(customer)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
              >
                <KeyRound className="size-4" />
                Grant Access
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}

/** Customers list page — metric cards, segment chips, filters, table with row actions */
export function CustomersList() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chip, setChip] = useState<CustomerChip>("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [grantFor, setGrantFor] = useState<Customer | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // The customers endpoint has no search/sort filters, so active and trashed
  // records are fetched once and filtering runs client-side — keeps the chip
  // counts and the search exact.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collected: Customer[] = [];
      for (const deleted of [false, true]) {
        const first = await customerApi.list(0, FETCH_SIZE, "createdAt,desc", deleted);
        collected.push(...first.content);
        for (let p = 1; p < first.totalPages; p++) {
          const next = await customerApi.list(p, FETCH_SIZE, "createdAt,desc", deleted);
          collected.push(...next.content);
        }
      }
      setAllCustomers(collected);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  const actions = useCustomerActions(() => load());

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
      all: allCustomers.filter((c) => !c.deleted).length,
      login: allCustomers.filter((c) => !c.deleted && c.hasLoginAccount).length,
      noLogin: allCustomers.filter((c) => !c.deleted && !c.hasLoginAccount).length,
      business: allCustomers.filter((c) => !c.deleted && !!c.companyName).length,
      deleted: allCustomers.filter((c) => c.deleted).length,
    }),
    [allCustomers]
  );

  const cities = useMemo(
    () => Array.from(new Set(allCustomers.filter((c) => !c.deleted && c.city).map((c) => c.city as string))).sort((a, b) => a.localeCompare(b)),
    [allCustomers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = allCustomers;
    if (chip === "deleted") {
      rows = rows.filter((c) => c.deleted);
    } else {
      rows = rows.filter((c) => !c.deleted);
      if (chip === "login") rows = rows.filter((c) => c.hasLoginAccount);
      if (chip === "no-login") rows = rows.filter((c) => !c.hasLoginAccount);
      if (chip === "business") rows = rows.filter((c) => !!c.companyName);
      if (cityFilter !== "all") rows = rows.filter((c) => c.city === cityFilter);
    }
    if (q) {
      rows = rows.filter((c) =>
        [c.name, c.email, c.phone, c.companyName, c.city].some((v) => v?.toLowerCase().includes(q))
      );
    }
    const sorted = [...rows];
    if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === "oldest") sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [allCustomers, chip, cityFilter, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const deletedChip = chip === "deleted";

  const stats: StatCardItem[] = [
    { key: "total", label: "Total Customers", value: counts.all, icon: Users, tone: "violet", ...growthSub(growthOf(allCustomers.filter((c) => !c.deleted))) },
    { key: "login", label: "Login Enabled", value: counts.login, icon: KeyRound, tone: "emerald", sub: `${counts.all ? Math.round((counts.login / counts.all) * 100) : 0}% of all customers`, progress: counts.all ? Math.round((counts.login / counts.all) * 100) : 0 },
    { key: "no-login", label: "No Login", value: counts.noLogin, icon: UserX, tone: "amber", sub: "Staff-created records" },
    { key: "business", label: "Businesses", value: counts.business, icon: Briefcase, tone: "blue", ...growthSub(growthOf(allCustomers.filter((c) => !c.deleted && !!c.companyName))) },
    { key: "deleted", label: "Deleted", value: counts.deleted, icon: Trash2, tone: "rose", sub: "Restorable from trash" },
  ];

  const clearFilters = () => {
    setCityFilter("all");
    setQuery("");
    setPage(0);
  };

  const activeFilterCount = (cityFilter !== "all" ? 1 : 0) + (query.trim() ? 1 : 0);

  const chipOptions = [
    { value: "all" as CustomerChip, label: "All", icon: Users, count: counts.all },
    { value: "login" as CustomerChip, label: "Login", icon: KeyRound, count: counts.login },
    { value: "no-login" as CustomerChip, label: "No Login", icon: UserX, count: counts.noLogin },
    { value: "business" as CustomerChip, label: "Businesses", icon: Briefcase, count: counts.business },
    { value: "deleted" as CustomerChip, label: "Deleted", icon: Trash2, count: counts.deleted },
  ];

  const emptyCopy = deletedChip
    ? { title: "No deleted customers", description: "Deleted records move here and can be restored anytime." }
    : allCustomers.length === 0
      ? { title: "No customers yet", description: "Add your first customer to get started." }
      : { title: "No customers match", description: "Try a different filter or clear the search." };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="Customers"
        subtitle="Your customer directory"
        actions={
          <>
            <Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>
              Refresh
            </Button>
            {canManage && <Link href="/customers/new">
              <Button icon={<UserPlus className="size-4" />}>Add Customer</Button>
            </Link>}
          </>
        }
      />

      {loading && allCustomers.length === 0 ? (
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <FilterTabs<CustomerChip>
            value={chip}
            options={chipOptions}
            onChange={(value) => {
              setChip(value);
              setPage(0);
            }}
          />
          <div className="flex items-center gap-2">
            <div className="relative" ref={filtersRef}>
              <Button variant="outline" icon={<SlidersHorizontal className="size-4" />} onClick={() => setFiltersOpen((open) => !open)}>
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {filtersOpen && (
                <div className="absolute right-0 top-11 z-30 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl animate-pop-in dark:border-slate-700 dark:bg-slate-900">
                  <label htmlFor="customer-search" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Search
                  </label>
                  <div className="relative mt-1.5">
                    <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-slate-400" />
                    <input
                      id="customer-search"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setPage(0);
                      }}
                      placeholder="Name, phone, email or company"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
                    />
                  </div>
                  <label htmlFor="customer-city" className="mt-4 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    City
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      id="customer-city"
                      value={cityFilter}
                      onChange={(event) => {
                        setCityFilter(event.target.value);
                        setPage(0);
                      }}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="all">All cities</option>
                      {cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-slate-400" />
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
                aria-label="Sort customers"
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

        {loading && allCustomers.length === 0 ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title={emptyCopy.title} description={emptyCopy.description} />
        ) : (
          <>
            <ResponsiveTable
              rows={pageRows}
              rowKey="id"
              columns={[
                {
                  header: "Customer",
                  accessor: (customer) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={customer.name} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{customer.name}</p>
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                          {customer.email ?? customer.phone}
                        </p>
                      </div>
                    </div>
                  ),
                  primaryMobile: true,
                },
                {
                  header: "Company",
                  accessor: (customer) => (
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Briefcase className="size-3.5 shrink-0 text-slate-400" />
                      <span className="max-w-[200px] truncate" title={customer.companyName ?? undefined}>
                        {customer.companyName || "—"}
                      </span>
                    </span>
                  ),
                },
                {
                  header: "City",
                  accessor: (customer) => (
                    <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <MapPin className="size-3.5 shrink-0 text-slate-400" />
                      {customer.city || "—"}
                    </span>
                  ),
                },
                {
                  header: "Portal",
                  accessor: (customer) =>
                    customer.deleted ? <DeletedBadge /> : <PortalBadge enabled={customer.hasLoginAccount} />,
                },
                {
                  header: deletedChip ? "Deleted On" : "Created",
                  accessor: (customer) => {
                    const stamp = deletedChip && customer.deletedAt ? customer.deletedAt : customer.createdAt;
                    return (
                      <span className="inline-flex items-start gap-1.5">
                        <Calendar className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                        <span>
                          <p className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{formatLongDate(stamp)}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{formatTime(stamp)}</p>
                        </span>
                      </span>
                    );
                  },
                },
              ]}
              actions={canManage ? (customer) =>
                deletedChip ? (
                  <>
                    <Link href={`/customers/${customer.id}`} aria-label={`View ${customer.name}`} title="View details">
                      <Button variant="outline" size="sm" icon={<Eye className="size-4" />}>
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="soft-danger"
                      size="sm"
                      icon={<RotateCcw className="size-4" />}
                      onClick={() => actions.request("restore", customer)}
                    >
                      Restore
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href={`/customers/${customer.id}`} aria-label={`View ${customer.name}`} title="View details">
                      <Button variant="outline" size="sm" icon={<Eye className="size-4" />}>
                        View
                      </Button>
                    </Link>
                    {!customer.hasLoginAccount && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<KeyRound className="size-4" />}
                        onClick={() => setGrantFor(customer)}
                      >
                        Grant Access
                      </Button>
                    )}
                  </>
                ) : undefined
              }
              renderMobileCard={canManage ? (customer) => (
                <CustomerMobileCard
                  customer={customer}
                  deletedRow={Boolean(deletedChip)}
                  onRestore={(target) => actions.request("restore", target)}
                  onGrant={setGrantFor}
                />
              ) : undefined}
            />
            <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalElements={filtered.length}
                pageSize={PAGE_SIZE}
                label="customers"
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {actions.dialog}
      {grantFor && (
        <GrantAccessDialog
          key={grantFor.id}
          customer={grantFor}
          onClose={() => setGrantFor(null)}
          onGranted={() => {
            setGrantFor(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
