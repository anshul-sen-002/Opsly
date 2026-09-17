"use client";

import { Wallet, RefreshCw } from "lucide-react";
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
const columns: Column<Payment>[] = [
  { header: "Payment", accessor: (payment) => `#${payment.id}`, primaryMobile: true },
  { header: "Invoice", accessor: "invoiceNumber" },
  { header: "Amount", accessor: (payment) => formatCurrency(payment.amount) },
  { header: "Method", accessor: (payment) => <PaymentMethodBadge method={payment.paymentMethod} /> },
  { header: "Status", accessor: (payment) => <PaymentStatusBadge status={payment.status} /> },
  { header: "Reference", accessor: (payment) => payment.transactionReference ?? "—" },
  { header: "Paid on", accessor: (payment) => payment.paidAt ? formatDate(payment.paidAt) : "—" },
];

export default function MyPaymentsPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<Payment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (target: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await paymentApi.myPayments(target, PAGE_SIZE));
      setPage(target);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your payments.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(0); }, [load]);

  return <div className="space-y-6">
    <PageHeader icon={Wallet} title="Payments" subtitle="Payments received against your invoices. These records are read-only." actions={
      <Button variant="outline" disabled={loading} icon={<RefreshCw className="size-4" />} onClick={() => void load(page)}>Refresh</Button>
    } />
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {loading ? <TableSkeleton rows={5} /> : error ? <ErrorState message={error} onRetry={() => void load(page)} /> : !data?.content.length ?
        <EmptyState icon={Wallet} title="No payments yet" description="Payments for your invoices will appear here once recorded." /> : <>
          <ResponsiveTable columns={columns} rows={data.content} rowKey="id" />
          <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} pageSize={PAGE_SIZE} label="payments" onPageChange={(next) => void load(next)} />
          </div>
        </>}
    </div>
  </div>;
}
