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
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  DeletedBadge,
  InvoiceStatusBadge,
  JobStatusBadge,
  RoleBadge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ProfileSkeleton } from "@/components/ui/states";
import { ApiError, customerApi, invoiceApi, jobApi } from "@/lib/api";
import {
  cn,
  displayNameFromEmail,
  formatCurrency,
  formatDateTime,
  formatLongDate,
} from "@/lib/utils";
import type { Customer, Invoice, Job } from "@/types";
import type { LucideIcon } from "lucide-react";
import { ProfileImageUpload } from "./profile-image-upload";

type TabId = "overview" | "personal" | "services" | "permissions" | "activity";

/** What a CUSTOMER account is allowed to do — mirrors the staff permission list */
const CUSTOMER_PERMISSIONS = [
  { label: "Raise and track their own service requests", allowed: true },
  { label: "View their own jobs and invoices", allowed: true },
  { label: "Use the Opsly AI assistant", allowed: true },
  { label: "Manage staff or other customers", allowed: false },
  { label: "Assign, complete or close jobs", allowed: false },
];

/** Card with icon + title header — same look as the staff profile cards */
function InfoCard({
  icon: Icon,
  title,
  action,
  className,
  children,
}: {
  icon: LucideIcon;
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
      <p className="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-white">
        {children}
      </p>
    </div>
  );
}

/** Service-request row — links into the customer requests list */
function RequestRow({ job }: { job: Job }) {
  return (
    <Link
      href="/customer/requests"
      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          #JOB-{job.id}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{job.description}</p>
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
          {formatLongDate(job.createdAt)}
        </p>
      </div>
      <JobStatusBadge status={job.status} />
    </Link>
  );
}

/** Invoice row — links into the customer invoices list */
function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <Link
      href="/customer/invoices"
      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {invoice.invoiceNumber}
          <span className="ml-2 font-normal text-xs text-slate-500 dark:text-slate-400">
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

/** Customer portal "My Profile" — mirrors the staff user profile layout */
export function CustomerProfile() {
  const { user: sessionUser } = useAuth();

  const [profile, setProfile] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [me, jobPage, invoicePage] = await Promise.all([
          customerApi.me(),
          jobApi.myRequests(0, 100),
          invoiceApi.myInvoices(0, 100).catch(() => null),
        ]);

        if (cancelled) return;

        setProfile(me);
        setJobs(jobPage.content);
        setInvoices(invoicePage?.content ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load your profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <ProfileSkeleton label="Loading your profile" />;

  if (error || !profile) {
    return <ErrorState title="Could not load your profile" message={error ?? undefined} />;
  }

  const loginEmail = sessionUser?.email ?? profile.email ?? "—";
  const displayName = profile.name || displayNameFromEmail(loginEmail);

  const activeRequests = jobs.filter(
    (job) => job.status === "ASSIGNED" || job.status === "IN_PROGRESS"
  ).length;
  const completedRequests = jobs.filter(
    (job) => job.status === "COMPLETED" || job.status === "CLOSED"
  ).length;
  const outstanding = invoices
    .filter((invoice) => invoice.status !== "DRAFT")
    .reduce((sum, invoice) => sum + Math.max(invoice.totalAmount - invoice.paidAmount, 0), 0);

  const recentRequests = jobs.slice(0, 4);
  const recentInvoices = invoices.slice(0, 4);
  const serviceRequests = jobs.slice(0, 10);
  const serviceInvoices = invoices.slice(0, 10);

  // Requests and invoice events merged into one newest-first timeline
  const activity = [
    ...jobs.map((job) => ({
      id: `job-${job.id}`,
      title: `Request #JOB-${job.id} raised`,
      detail: job.description,
      at: job.createdAt,
    })),
    ...invoices
      .filter((invoice) => invoice.issuedAt)
      .map((invoice) => ({
        id: `invoice-${invoice.id}`,
        title: `Invoice ${invoice.invoiceNumber} issued`,
        detail: `${formatCurrency(invoice.totalAmount)} · ${invoice.status
          .replace("_", " ")
          .toLowerCase()}`,
        at: invoice.issuedAt as string,
      })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "personal", label: "Personal Info" },
    { id: "services", label: "My Services" },
    { id: "permissions", label: "Permissions" },
    { id: "activity", label: "Activity Log" },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400"
      >
        <Link
          href="/customer/dashboard"
          className="transition hover:text-slate-800 dark:hover:text-slate-200"
        >
          Dashboard
        </Link>

        <ChevronRight className="size-3.5" />

        <span className="font-medium text-slate-700 dark:text-slate-200">My Profile</span>
      </nav>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <ProfileImageUpload
            name={displayName}
            imageUrl={profile.profileImageUrl}
            onUploaded={(imageUrl) =>
              setProfile((prev) => (prev ? { ...prev, profileImageUrl: imageUrl } : prev))
            }
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                {displayName}
              </h1>

              <RoleBadge role="CUSTOMER" />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex min-w-0 max-w-full items-center gap-1.5">
                <Mail className="size-4 shrink-0" />

                <span className="min-w-0 break-all">{loginEmail}</span>
              </span>

              <span className="flex items-center gap-1.5">
                <Phone className="size-4" />
                {profile.phone ?? "Not provided"}
              </span>

              {profile.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {profile.city}
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {profile.deleted ? (
                <DeletedBadge />
              ) : (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30">
                  Joined {formatLongDate(profile.createdAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link href="/customer/requests">
              <Button variant="outline" icon={<ClipboardList className="size-4" />}>
                My Requests
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
                    <InfoRow label="Full Name">{displayName}</InfoRow>

                    <InfoRow label="Email">{loginEmail}</InfoRow>

                    <InfoRow label="Phone">{profile.phone ?? "Not provided"}</InfoRow>

                    <InfoRow label="Customer ID">{`CUS-${profile.id}`}</InfoRow>
                  </div>
                </InfoCard>

                <InfoCard icon={ShieldCheck} title="Account">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Role">
                      <RoleBadge role="CUSTOMER" />
                    </InfoRow>

                    <InfoRow label="Status">
                      {profile.deleted ? (
                        <DeletedBadge />
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </InfoRow>

                    <InfoRow label="Joined On">{formatLongDate(profile.createdAt)}</InfoRow>

                    <InfoRow label="Company">{profile.companyName ?? "Not provided"}</InfoRow>
                  </div>
                </InfoCard>
              </div>

              <InfoCard
                icon={Briefcase}
                title="Recent Requests"
                action={
                  <Link
                    href="/customer/requests"
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
                    No service requests yet — they will appear here once they are raised.
                  </p>
                )}
              </InfoCard>

              <InfoCard
                icon={Receipt}
                title="Recent Invoices"
                action={
                  <Link
                    href="/customer/invoices"
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No invoices yet — they appear once a request is completed and billed.
                  </p>
                )}
              </InfoCard>
            </>
          )}

          {tab === "personal" && (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <InfoCard icon={User} title="Contact Information">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Full Name">{displayName}</InfoRow>

                    <InfoRow label="Login Email">{loginEmail}</InfoRow>

                    <InfoRow label="Contact Email">{profile.email ?? "Not provided"}</InfoRow>

                    <InfoRow label="Phone">{profile.phone ?? "Not provided"}</InfoRow>
                  </div>
                </InfoCard>

                <InfoCard icon={Building2} title="Business Details">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow label="Company">{profile.companyName ?? "Not provided"}</InfoRow>

                    <InfoRow label="City">{profile.city ?? "Not provided"}</InfoRow>

                    <InfoRow label="Customer ID">{`CUS-${profile.id}`}</InfoRow>

                    <InfoRow label="Member Since">{formatLongDate(profile.createdAt)}</InfoRow>
                  </div>
                </InfoCard>
              </div>

              <InfoCard icon={MapPin} title="Service Address">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {profile.address ?? "No address on file."}
                </p>
              </InfoCard>

              <InfoCard icon={ClipboardList} title="Need a change?">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your profile details are maintained by the Opsly team. Reach out to your
                  service provider to update your name, phone, company or address.
                </p>
              </InfoCard>
            </>
          )}

          {tab === "services" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <InfoCard
                icon={Briefcase}
                title="My Requests"
                action={
                  <Link
                    href="/customer/requests"
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    View all
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              >
                {serviceRequests.length > 0 ? (
                  <div className="space-y-2">
                    {serviceRequests.map((job) => (
                      <RequestRow key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No service requests yet.
                  </p>
                )}
              </InfoCard>

              <InfoCard
                icon={Receipt}
                title="My Invoices"
                action={
                  <Link
                    href="/customer/invoices"
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    View all
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              >
                {serviceInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {serviceInvoices.map((invoice) => (
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

                  <InfoRow label="Status">
                    {profile.deleted ? (
                      <DeletedBadge />
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    )}
                  </InfoRow>

                  <InfoRow label="Joined On">{formatLongDate(profile.createdAt)}</InfoRow>

                  <InfoRow label="Customer ID">{`CUS-${profile.id}`}</InfoRow>
                </div>
              </InfoCard>

              <InfoCard icon={CheckCircle2} title="CUSTOMER permissions">
                <ul className="space-y-2.5">
                  {CUSTOMER_PERMISSIONS.map((permission) => (
                    <li key={permission.label} className="flex items-start gap-2.5 text-sm">
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

          {tab === "activity" &&
            (activity.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activity.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <History className="size-3.5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {item.title}
                        </p>

                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {item.detail}
                        </p>
                      </div>

                      <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                        {formatDateTime(item.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <EmptyState
                  icon={History}
                  title="No activity recorded yet"
                  description="Requests you raise and invoices issued to you will appear here."
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
                  profile.deleted ? "bg-slate-400" : "bg-emerald-500"
                )}
              />

              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {profile.deleted ? "Deleted" : "Active"}
              </span>
            </div>

            <span className="text-xs text-slate-400 dark:text-slate-500">Status</span>
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
              <Link
                href="/customer/dashboard"
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
              >
                <Activity className="size-4" />
                Dashboard
              </Link>

              <Link
                href="/customer/requests"
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
              >
                <ClipboardList className="size-4" />
                My Requests
              </Link>

              <Link
                href="/customer/invoices"
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
              >
                <Receipt className="size-4" />
                My Invoices
              </Link>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}


