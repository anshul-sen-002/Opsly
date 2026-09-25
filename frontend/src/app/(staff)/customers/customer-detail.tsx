"use client";

import {
  Activity,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  KeyRound,
  Mail,
  MapPin,
  Pencil,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { DeletedBadge, InvoiceStatusBadge, JobStatusBadge, RoleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ProfileSkeleton } from "@/components/ui/states";
import { ApiError, customerApi, invoiceApi, jobApi } from "@/lib/api";
import { cn, formatCurrency, formatLongDate } from "@/lib/utils";
import type { Customer, Invoice, Job } from "@/types";
import { StatusToggle } from "../users/user-ui";
import { useCustomerActions } from "./customer-actions";
import { GrantAccessDialog } from "./grant-access-dialog";

type TabId = "overview" | "personal" | "services" | "permissions" | "activity";

/** What a CUSTOMER account is allowed to do — mirrors the portal profile list */
const CUSTOMER_PERMISSIONS = [
  { label: "Raise and track their own service requests", allowed: true },
  { label: "View their own jobs and invoices", allowed: true },
  { label: "Use the Opsly AI assistant", allowed: true },
  { label: "Manage staff or other customers", allowed: false },
  { label: "Assign, complete or close jobs", allowed: false },
];

/** Card with icon + title header — same look as the My Profile page cards */
function InfoCard({
  icon: Icon,
  title,
  action,
  className,
  children,
}: {
  icon: typeof Briefcase;
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
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

/** Label above value */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-white">{children}</p>
    </div>
  );
}

/** Service-request row — links into the staff job detail page */
function RequestRow({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">#JOB-{job.id}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{job.description}</p>
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{formatLongDate(job.createdAt)}</p>
      </div>
      <JobStatusBadge status={job.status} />
    </Link>
  );
}

/** Invoice row — links into the staff invoice detail page */
function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <Link
      href={`/invoices/${invoice.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {invoice.invoiceNumber}
          <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
            {formatCurrency(invoice.totalAmount)}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
          {invoice.issuedAt ? formatLongDate(invoice.issuedAt) : "Not issued yet"}
        </p>
      </div>
      <InvoiceStatusBadge status={invoice.status} />
    </Link>
  );
}

/** Small numeric tile used by the "At a glance" card */
function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

/** Staff-side customer detail page — mirrors the customer My Profile layout */
export function CustomerDetail() {
  const params = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [grantOpen, setGrantOpen] = useState(false);

  const reload = useCallback(async () => {
    const [profile, jobPage, invoicePage] = await Promise.all([
      customerApi.getById(params.id),
      jobApi.list(0, 100),
      invoiceApi.list(0, 100).catch(() => null),
    ]);
    setCustomer(profile);
    setJobs(jobPage.content.filter((job) => job.customerId === profile.id));
    setInvoices(invoicePage?.content.filter((invoice) => invoice.customerId === profile.id) ?? []);
  }, [params.id]);

  const actions = useCustomerActions(() => void reload());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load customer.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <ProfileSkeleton label="Loading customer" />;
  if (error || !customer) {
    return <ErrorState title="Could not load customer" message={error ?? undefined} />;
  }

  // Linked auth-account state — suspend/reactivate flips users.status only
  const hasLogin = customer.hasLoginAccount && !customer.loginDeleted;
  const loginActive = hasLogin && customer.loginStatus === "ACTIVE";
  const portalStatusText = !customer.hasLoginAccount
    ? "No login"
    : customer.loginDeleted
      ? "Login deleted"
      : customer.loginStatus === "ACTIVE"
        ? "Login active"
        : "Login suspended";
  const portalStatusDot = loginActive
    ? "bg-emerald-500"
    : customer.hasLoginAccount && !customer.loginDeleted
      ? "bg-amber-500"
      : "bg-slate-400";
  const portalToggleDisabled = !hasLogin || customer.deleted;

  const activeRequests = jobs.filter(
    (job) => job.status === "ASSIGNED" || job.status === "IN_PROGRESS"
  ).length;
  const completedRequests = jobs.filter(
    (job) => job.status === "COMPLETED" || job.status === "CLOSED"
  ).length;
  const outstanding = invoices
    .filter((invoice) => invoice.status !== "DRAFT")
    .reduce((sum, invoice) => sum + (invoice.totalAmount - invoice.paidAmount), 0);

  const recentRequests = [...jobs].slice(0, 4);
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const activity = [
    ...jobs.map((job) => ({
      icon: Briefcase as typeof Briefcase,
      title: `Request #JOB-${job.id} logged`,
      detail: job.description,
      at: job.createdAt,
    })),
    ...invoices
      .filter((invoice) => invoice.issuedAt)
      .map((invoice) => ({
        icon: Receipt as typeof Receipt,
        title: `Invoice ${invoice.invoiceNumber} issued`,
        detail: `${formatCurrency(invoice.totalAmount)} · ${invoice.status.replace("_", " ").toLowerCase()}`,
        at: invoice.issuedAt as string,
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "personal", label: "Personal Info" },
    { id: "services", label: "Services" },
    { id: "permissions", label: "Permissions" },
    { id: "activity", label: "Activity Log" },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/customers" className="transition hover:text-slate-800 dark:hover:text-slate-200">
          Customers
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-slate-700 dark:text-slate-200">{customer.name}</span>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar name={customer.name} imageUrl={customer.profileImageUrl} size="xl" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                {customer.name}
              </h1>
              <RoleBadge role="CUSTOMER" />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex min-w-0 max-w-full items-center gap-1.5">
                <Mail className="size-4 shrink-0" />
                <span className="min-w-0 break-all">{customer.email ?? "No email yet"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {customer.city ?? "Not provided"}
              </span>
              {customer.companyName && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4" />
                  {customer.companyName}
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {customer.deleted ? (
                <DeletedBadge />
              ) : (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30">
                  Joined {formatLongDate(customer.createdAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link href={`/customers/${customer.id}/edit`}>
              <Button variant="outline" icon={<Pencil className="size-4" />}>
                Edit Customer
              </Button>
            </Link>
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
                  tab === item.id
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
          {tab === "overview" && (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <InfoCard icon={User} title="About">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Full Name">{customer.name}</InfoRow>
                    <InfoRow label="Email">{customer.email ?? "No email yet"}</InfoRow>
                    <InfoRow label="Phone">{customer.phone}</InfoRow>
                    <InfoRow label="Customer ID">{`CUS-${customer.id}`}</InfoRow>
                  </div>
                </InfoCard>

                <InfoCard icon={ShieldCheck} title="Account">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Role">
                      <RoleBadge role="CUSTOMER" />
                    </InfoRow>
                    <InfoRow label="Portal Access">
                      <span className="inline-flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", portalStatusDot)} />
                        {portalStatusText}
                      </span>
                    </InfoRow>
                    <InfoRow label="Joined On">{formatLongDate(customer.createdAt)}</InfoRow>
                    <InfoRow label="Company">{customer.companyName ?? "Not provided"}</InfoRow>
                  </div>
                </InfoCard>
              </div>

              <InfoCard
                icon={Briefcase}
                title="Recent Requests"
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
                {recentRequests.length > 0 ? (
                  <div className="space-y-2">
                    {recentRequests.map((job) => (
                      <RequestRow key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No service requests yet — create one from the Jobs page.
                  </p>
                )}
              </InfoCard>

              <InfoCard
                icon={Receipt}
                title="Recent Invoices"
                action={
                  <Link
                    href="/invoices"
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    View all
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              >
                {recentInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {recentInvoices.map((invoice) => (
                      <InvoiceRow key={invoice.id} invoice={invoice} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No invoices yet.</p>
                )}
              </InfoCard>
            </>
          )}

          {tab === "personal" && (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <InfoCard icon={User} title="Personal Information">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Full Name">{customer.name}</InfoRow>
                    <InfoRow label="Phone">{customer.phone}</InfoRow>
                    <InfoRow label="Email">{customer.email ?? "No email yet"}</InfoRow>
                    <InfoRow label="Company">{customer.companyName ?? "Not provided"}</InfoRow>
                    <InfoRow label="Customer ID">{`CUS-${customer.id}`}</InfoRow>
                    <InfoRow label="Customer Since">{formatLongDate(customer.createdAt)}</InfoRow>
                  </div>
                </InfoCard>

                <InfoCard icon={MapPin} title="Service Address">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {customer.address ?? "No address on file."}
                  </p>
                </InfoCard>
              </div>

              <InfoCard icon={Pencil} title="Need a change?">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Update this customer&apos;s name, phone, company or address from the edit form.
                  </p>
                  <Link href={`/customers/${customer.id}/edit`}>
                    <Button variant="outline" size="sm" icon={<Pencil className="size-4" />}>
                      Edit Customer
                    </Button>
                  </Link>
                </div>
              </InfoCard>
            </>
          )}

          {tab === "services" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <InfoCard icon={Briefcase} title="Requests">
                {jobs.length > 0 ? (
                  <div className="space-y-2">
                    {jobs.map((job) => (
                      <RequestRow key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No service requests yet.</p>
                )}
              </InfoCard>

              <InfoCard icon={Receipt} title="Invoices">
                {invoices.length > 0 ? (
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <InvoiceRow key={invoice.id} invoice={invoice} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No invoices yet.</p>
                )}
              </InfoCard>
            </div>
          )}

          {tab === "permissions" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <InfoCard icon={ShieldCheck} title="Role & Status">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoRow label="Role">
                    <RoleBadge role="CUSTOMER" />
                  </InfoRow>
                  <InfoRow label="Portal Access">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", portalStatusDot)} />
                      {portalStatusText}
                    </span>
                  </InfoRow>
                  <InfoRow label="Joined On">{formatLongDate(customer.createdAt)}</InfoRow>
                  <InfoRow label="Customer ID">{`CUS-${customer.id}`}</InfoRow>
                </div>
              </InfoCard>

              <InfoCard icon={ShieldCheck} title="What this customer can do">
                <ul className="space-y-2.5">
                  {CUSTOMER_PERMISSIONS.map((permission) => (
                    <li key={permission.label} className="flex items-start gap-2.5 text-sm">
                      {permission.allowed ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-slate-300 dark:text-slate-600" />
                      )}
                      <span className="text-slate-600 dark:text-slate-300">{permission.label}</span>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            </div>
          )}

          {tab === "activity" &&
            (activity.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activity.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <item.icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                          {formatLongDate(item.at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <EmptyState
                  icon={History}
                  title="No activity recorded yet"
                  description="Requests raised and invoices issued to this customer will appear here."
                />
              </div>
            ))}
        </div>

        <div className="space-y-5 xl:col-span-1 xl:self-start">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  customer.deleted
                    ? "bg-slate-400"
                    : customer.loginStatus === "INACTIVE"
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                )}
              />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {customer.deleted
                  ? "Deleted"
                  : customer.loginStatus === "INACTIVE"
                    ? "Inactive"
                    : "Active"}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400 dark:text-slate-500">Status</span>
              <StatusToggle
                checked={loginActive}
                disabled={portalToggleDisabled}
                onChange={() =>
                  actions.request(
                    loginActive ? "suspend-login" : "reactivate-login",
                    customer
                  )
                }
              />
            </div>
          </div>

          <InfoCard icon={Activity} title="At a Glance">
            <div className="grid grid-cols-2 gap-4">
              <StatTile label="Total Requests" value={jobs.length} />
              <StatTile label="In Progress" value={activeRequests} />
              <StatTile label="Completed" value={completedRequests} />
              <StatTile label="Outstanding" value={formatCurrency(outstanding)} />
            </div>
          </InfoCard>

          <InfoCard icon={ClipboardList} title="Quick Actions">
            <div className="space-y-2">
              {!customer.hasLoginAccount && !customer.deleted && (
                <button
                  type="button"
                  onClick={() => setGrantOpen(true)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                >
                  <KeyRound className="size-4" />
                  Grant Portal Access
                </button>
              )}

              <Link
                href={`/customers/${customer.id}/edit`}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
              >
                <Pencil className="size-4" />
                Edit Customer
              </Link>

              {customer.deleted ? (
                <button
                  type="button"
                  onClick={() => actions.request("restore", customer)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                >
                  <RotateCcw className="size-4" />
                  Restore Customer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => actions.request("delete", customer)}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="size-4" />
                  Delete Customer
                </button>
              )}
            </div>
          </InfoCard>
        </div>
      </div>

      {actions.dialog}
      {grantOpen && (
        <GrantAccessDialog
          key={customer.id}
          customer={customer}
          onClose={() => setGrantOpen(false)}
          onGranted={(updated) => {
            setGrantOpen(false);
            setCustomer(updated);
            void reload();
          }}
        />
      )}
    </div>
  );
}