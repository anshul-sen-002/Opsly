"use client";

import { ExternalLink, Receipt, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ApiError, invoiceApi } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Invoice, Paged } from "@/types";

const PAGE_SIZE = 10;

function MyInvoicesContent() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<Invoice> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await invoiceApi.myInvoices(targetPage, PAGE_SIZE));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load]);

  const invoices = data?.content ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Invoices raised against your service requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(page)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(page)} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Invoices appear here after your requests are completed and billed."
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((invoice) => {
                const balance = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
                return (
                  <div key={invoice.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {invoice.invoiceNumber}
                        <span className="ml-2 font-normal text-xs text-slate-500 dark:text-slate-400">
                          Job #{invoice.jobId}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        Total {formatCurrency(invoice.totalAmount)} · Balance{" "}
                        <span
                          className={
                            balance === 0
                              ? "font-medium text-emerald-600 dark:text-emerald-400"
                              : "font-medium text-slate-600 dark:text-slate-300"
                          }
                        >
                          {formatCurrency(balance)}
                        </span>
                        {invoice.issuedAt ? ` · Issued ${formatDateTime(invoice.issuedAt)}` : ""}
                      </p>
                    </div>
                    {invoice.fileUrl && (
                      <a
                        href={invoice.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                      >
                        <ExternalLink className="size-3.5" />
                        View file
                      </a>
                    )}
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                );
              })}
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

export default function MyInvoicesPage() {
  return <MyInvoicesContent />;
}
