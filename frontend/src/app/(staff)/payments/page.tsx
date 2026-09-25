"use client";

import { CreditCard, Eye, Pencil, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";
import { AdminOnly } from "@/components/admin-only";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/providers/toast-provider";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PaymentMethodBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ResponsiveTable, type Column } from "@/components/ui/responsive-table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ApiError, paymentApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Paged, Payment } from "@/types";

const PAGE_SIZE = 10;

function PaymentsPageContent() {
  const toast = useToast();
  const [deleteFor, setDeleteFor] = useState<Payment | null>(null);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<Payment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await paymentApi.list(targetPage, PAGE_SIZE, "createdAt,desc"));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load]);

  const payments = data?.content ?? [];

  const columns: Column<Payment>[] = [
    {
      header: "Payment",
      accessor: (payment) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-white">#{payment.id}</p>
          <p className="text-xs text-slate-400">{payment.transactionReference ?? "No reference"}</p>
        </div>
      ),
    },
    {
      header: "Invoice",
      accessor: (payment) => (
        <Link
          href={`/invoices/${payment.invoiceId}`}
          className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
        >
          {payment.invoiceNumber}
        </Link>
      ),
    },
    {
      header: "Amount",
      accessor: (payment) => (
        <span className="font-medium text-slate-900 dark:text-white">
          {formatCurrency(payment.amount)}
        </span>
      ),
    },
    { header: "Method", accessor: (payment) => <PaymentMethodBadge method={payment.paymentMethod} /> },
    { header: "Status", accessor: (payment) => <PaymentStatusBadge status={payment.status} /> },
    {
      header: "Paid on",
      accessor: (payment) => (payment.paidAt ? formatDate(payment.paidAt) : "-"),
    },
  ];

  const renderActions = (payment: Payment) => (
    <>
    <Link href={`/payments/${payment.id}/edit`}>
      <Button variant="ghost" size="sm" icon={<Pencil className="size-4" />}>Edit</Button>
    </Link>
    <Button variant="soft-danger" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setDeleteFor(payment)}>Delete</Button>
    <Link href={`/invoices/${payment.invoiceId}`}>
      <Button variant="ghost" size="sm" icon={<Eye className="size-4" />}>
        Invoice
      </Button>
    </Link>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title="Payments"
        subtitle="Money received against issued invoices"
        actions={
          <>
            <Button
              variant="outline"
              icon={<RefreshCw className="size-4" />}
              onClick={() => void load(page)}
            >
              Refresh
            </Button>
            <Link href="/payments/new">
              <Button icon={<Plus className="size-4" />}>Record Payment</Button>
            </Link>
          </>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(page)} />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments recorded"
            description="Payments are recorded against issued invoices. Issue an invoice first, then record its payment."
          />
        ) : (
          <>
            <ResponsiveTable columns={columns} rows={payments} rowKey="id" actions={renderActions} />
            {data && (
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6">
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  totalElements={data.totalElements}
                  pageSize={PAGE_SIZE}
                  label="payments"
                  onPageChange={(next) => void load(next)}
                />
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog open={deleteFor !== null} onClose={() => setDeleteFor(null)} title="Delete payment?"
        message={`Delete payment #${deleteFor?.id ?? ""}? This cannot be undone. The invoice balance will be recalculated.`}
        variant="danger" onConfirm={async () => {
          if (!deleteFor) return;
          try {
            await paymentApi.delete(deleteFor.id);
            await load(payments.length === 1 && page > 0 ? page - 1 : page);
            // Close-first contract: ConfirmDialog fires this toast AFTER closing.
            return { title: "Payment deleted", description: "The invoice balance has been recalculated." };
          } catch (err) {
            toast.error("Delete failed", err instanceof ApiError ? err.message : "Failed to delete payment.");
            // Rethrow so the dialog stays open — error toast shows above it.
            throw err;
          }
        }} />
    </div>
  );
}

export default function PaymentsPage() {
  return <AdminOnly roles={["ADMIN", "MANAGER"]} title="Access denied" description="Only administrators and managers can manage payments."><PaymentsPageContent /></AdminOnly>;
}