"use client";

import { CalendarDays, CreditCard, Receipt, Send, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { InvoiceStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { ApiError, invoiceApi, paymentApi } from "@/lib/api";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import type { Invoice, Payment } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useInvoiceActions } from "../invoice-actions";
import { InfoCard, InfoRow } from "../../users/user-ui";
import { useToast } from "@/components/providers/toast-provider";

function InvoiceDetailPageContent() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actions = useInvoiceActions(() => load());
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoiceApi.getById(params.id);
      const paymentList = await paymentApi.listByInvoice(params.id).catch(() => [] as Payment[]);
      setInvoice(data);
      setPayments(paymentList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUploadFile = async (file: File | undefined) => {
    if (!file || uploading) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", "Invoice file must be under 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const updated = await invoiceApi.uploadFile(params.id, file);
      setInvoice(updated);
      toast.success("Invoice file uploaded", "The document is now attached to this invoice.");
    } catch (err) {
      toast.error("Upload failed", err instanceof ApiError ? err.message : "Unexpected error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (loading) return <PageLoader />;

  if (error || !invoice) {
    return <ErrorState title="Could not load invoice" message={error ?? undefined} onRetry={() => void load()} />;
  }

  const balance = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
  const payable = invoice.status !== "DRAFT";

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/invoices" className="transition hover:text-slate-800 dark:hover:text-slate-200">
          Invoices
        </Link>
        <span className="font-medium text-slate-700 dark:text-slate-200">/ {invoice.invoiceNumber}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Invoice for Job #{invoice.jobId} · {invoice.customerName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === "DRAFT" ? (
            <Button icon={<Send className="size-4" />} onClick={() => actions.request(invoice)}>
              Issue Invoice
            </Button>
          ) : (
            <Link href={`/payments/new?invoiceId=${invoice.id}`}>
              <Button icon={<CreditCard className="size-4" />}>Record Payment</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <InfoCard icon={Receipt} title="Amounts">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Subtotal">{formatCurrency(invoice.subtotal)}</InfoRow>
            <InfoRow label="Tax">{formatCurrency(invoice.tax)}</InfoRow>
            <InfoRow label="Total">{formatCurrency(invoice.totalAmount)}</InfoRow>
            <InfoRow label="Paid">
              <span className={cn(invoice.paidAmount >= invoice.totalAmount ? "text-emerald-600 dark:text-emerald-400" : "")}>
                {formatCurrency(invoice.paidAmount)}
              </span>
            </InfoRow>
            <InfoRow label="Balance Due">
              <span className={cn("font-semibold", balance === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white")}>
                {formatCurrency(balance)}
              </span>
            </InfoRow>
          </div>
        </InfoCard>

        <InfoCard icon={CalendarDays} title="Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Customer">{invoice.customerName}</InfoRow>
            <InfoRow label="Job">
              <Link href={`/jobs/${invoice.jobId}`} className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                #{invoice.jobId}
              </Link>
            </InfoRow>
            <InfoRow label="Created">{formatDateTime(invoice.createdAt)}</InfoRow>
            <InfoRow label="Issued">{invoice.issuedAt ? formatDateTime(invoice.issuedAt) : "Not issued yet"}</InfoRow>
            <InfoRow label="Due Date">{invoice.dueDate ? formatDateTime(invoice.dueDate) : "-"}</InfoRow>
          </div>
        </InfoCard>
      </div>

      <InfoCard
        icon={CreditCard}
        title="Payments"
        action={
          payable ? (
            <Link href={`/payments/new?invoiceId=${invoice.id}`} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              Record payment
            </Link>
          ) : undefined
        }
      >
        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(payment.amount)}
                    <span className="ml-2 font-normal text-xs text-slate-500 dark:text-slate-400">
                      {payment.transactionReference ?? "No reference"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                    {payment.paidAt ? formatDateTime(payment.paidAt) : "Not paid yet"}
                  </p>
                </div>
                <PaymentMethodBadge method={payment.paymentMethod} />
                <PaymentStatusBadge status={payment.status} />
              </div>
            ))}
          </div>
        ) : payable ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No payments recorded yet for this invoice.</p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Issue the invoice first — payments can only be recorded against issued invoices.
          </p>
        )}
      </InfoCard>

      {actions.dialog}
    </div>
  );
}

export default function InvoiceDetailPage() {
  return <InvoiceDetailPageContent />;
}
