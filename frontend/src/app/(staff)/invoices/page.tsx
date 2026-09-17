"use client";

import { CreditCard, Eye, Plus, Receipt, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ResponsiveTable, type Column } from "@/components/ui/responsive-table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ApiError, invoiceApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, InvoiceStatus, Paged } from "@/types";
import { useInvoiceActions } from "./invoice-actions";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: InvoiceStatus[] = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE"];

function InvoicesPageContent() {
  const [status, setStatus] = useState<InvoiceStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<Invoice> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actions = useInvoiceActions(() => load(page));

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await invoiceApi.list(targetPage, PAGE_SIZE, "createdAt,desc"));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load]);

  const invoices = (data?.content ?? []).filter(
    (invoice) => status === "ALL" || invoice.status === status
  );

  const columns: Column<Invoice>[] = [
    {
      header: "Invoice",
      accessor: (invoice) => (
        <div className="min-w-0">
          <Link
            href={`/invoices/${invoice.id}`}
            className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
          >
            {invoice.invoiceNumber}
          </Link>
          <p className="text-xs text-slate-400">Job #{invoice.jobId}</p>
        </div>
      ),
    },
    { header: "Customer", accessor: (invoice) => invoice.customerName },
    {
      header: "Total",
      accessor: (invoice) => (
        <span className="font-medium text-slate-900 dark:text-white">
          {formatCurrency(invoice.totalAmount)}
        </span>
      ),
    },
    {
      header: "Paid",
      accessor: (invoice) => (
        <span
          className={
            invoice.paidAmount >= invoice.totalAmount
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-slate-500"
          }
        >
          {formatCurrency(invoice.paidAmount)}
        </span>
      ),
    },
    { header: "Status", accessor: (invoice) => <InvoiceStatusBadge status={invoice.status} /> },
    {
      header: "Due",
      accessor: (invoice) => (invoice.dueDate ? formatDate(invoice.dueDate) : "-"),
    },
  ];

  const renderActions = (invoice: Invoice) => (
    <>
      {invoice.status === "DRAFT" && (
        <Button
          variant="outline"
          size="sm"
          icon={<Send className="size-4" />}
          onClick={() => actions.request(invoice)}
        >
          Issue
        </Button>
      )}
      {invoice.status !== "DRAFT" && (
        <Link href={`/payments/new?invoiceId=${invoice.id}`}>
          <Button variant="outline" size="sm" icon={<CreditCard className="size-4" />}>
            Pay
          </Button>
        </Link>
      )}
      <Link href={`/invoices/${invoice.id}`}>
        <Button variant="ghost" size="sm" icon={<Eye className="size-4" />}>
          View
        </Button>
      </Link>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Receipt}
        title="Invoices"
        subtitle="Billing raised against closed jobs"
        actions={
          <>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => setStatus(event.target.value as InvoiceStatus | "ALL")}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="ALL">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              icon={<RefreshCw className="size-4" />}
              onClick={() => void load(page)}
            >
              Refresh
            </Button>
            <Link href="/invoices/new">
              <Button icon={<Plus className="size-4" />}>New Invoice</Button>
            </Link>
          </>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(page)} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            description="Invoices are raised from closed jobs. Close a job first, then create its invoice."
          />
        ) : (
          <>
            <ResponsiveTable columns={columns} rows={invoices} rowKey="id" actions={renderActions} />
            {data && (
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6">
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  totalElements={data.totalElements}
                  pageSize={PAGE_SIZE}
                  label="invoices"
                  onPageChange={(next) => void load(next)}
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

export default function InvoicesPage() {
  return <InvoicesPageContent />;
}