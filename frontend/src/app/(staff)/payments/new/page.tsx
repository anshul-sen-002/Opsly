"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Hash, IndianRupee, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminOnly } from "@/components/admin-only";
import { useToast } from "@/components/providers/toast-provider";
import { EntityFormShell } from "@/components/ui/entity-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { ApiError, invoiceApi, paymentApi } from "@/lib/api";
import { formatCurrency, signalNotificationsChanged } from "@/lib/utils";
import type { Invoice } from "@/types";

const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Select an invoice"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((value) => Number(value) > 0, "Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"], { message: "Select a payment method" }),
  transactionReference: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

function NewPaymentPageContent() {
  const toast = useToast();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { invoiceId: "", amount: "", paymentMethod: "CASH", transactionReference: "" },
  });

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await invoiceApi.list(0, 100, "createdAt,desc");
      // Payments go against issued invoices that still have a balance due
      setInvoices(
        data.content.filter(
          (invoice) => invoice.status !== "DRAFT" && invoice.totalAmount - invoice.paidAmount > 0
        )
      );
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  // Preselect the invoice passed as ?invoiceId=... and default the amount to its balance
  useEffect(() => {
    if (invoices.length === 0) return;
    const requested = new URLSearchParams(window.location.search).get("invoiceId");
    const match = requested ? invoices.find((invoice) => String(invoice.id) === requested) : undefined;
    if (!match) return;
    const balance = match.totalAmount - match.paidAmount;
    setValue("invoiceId", String(match.id));
    if (balance > 0) setValue("amount", String(balance));
  }, [invoices, setValue]);

  const onSubmit = async (values: PaymentFormValues) => {
    setFormError(null);
    try {
      const created = await paymentApi.create({
        invoiceId: Number(values.invoiceId),
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
        transactionReference: values.transactionReference || undefined,
      });
      toast.success(
        "Payment recorded",
        `${formatCurrency(created.amount)} recorded against ${created.invoiceNumber}.`
      );
      signalNotificationsChanged();
      router.push("/payments");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof PaymentFormValues, { message });
        }
      } else {
        setFormError(error instanceof ApiError ? error.message : "Unexpected error. Please try again.");
      }
    }
  };

  if (loading) return <PageLoader />;

  if (loadError) {
    return <ErrorState title="Could not load invoices" message={loadError} onRetry={() => void loadInvoices()} />;
  }

  return (
    <EntityFormShell
      icon={<Wallet className="size-5" />}
      tone="emerald"
      title="Record Payment"
      subtitle="Money received against an issued invoice — the invoice status updates automatically"
      backHref="/payments"
      backLabel="Back to payments"
      sectionTitle="Payment Details"
      onSubmit={() => void handleSubmit(onSubmit)()}
      submitting={isSubmitting}
      submitLabel="Save payment"
      submitIcon={<Wallet className="size-4" />}
    >
      {formError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:col-span-2 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {formError}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 sm:col-span-2 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          No payable invoices with a balance due — issue an invoice first.
        </div>
      ) : (
        <Select label="Invoice" error={errors.invoiceId?.message} {...register("invoiceId")}>
          <option value="">Select an invoice</option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {`${invoice.invoiceNumber} · ${invoice.customerName} · balance ${formatCurrency(
                invoice.totalAmount - invoice.paidAmount
              )}`}
            </option>
          ))}
        </Select>
      )}

      <Input
        label="Amount (₹)"
        type="number"
        min="0"
        step="0.01"
        placeholder="e.g. 2500"
        icon={<IndianRupee className="size-4" />}
        error={errors.amount?.message}
        {...register("amount")}
      />
      <Select label="Payment method" error={errors.paymentMethod?.message} {...register("paymentMethod")}>
        <option value="CASH">Cash</option>
        <option value="UPI">UPI</option>
        <option value="CARD">Card</option>
        <option value="BANK_TRANSFER">Bank transfer</option>
      </Select>
      <Input
        label="Transaction reference (optional)"
        placeholder="e.g. UPI/123456789"
        icon={<Hash className="size-4" />}
        error={errors.transactionReference?.message}
        {...register("transactionReference")}
      />
    </EntityFormShell>
  );
}

export default function NewPaymentPage() {
  return <AdminOnly roles={["ADMIN", "MANAGER"]} title="Access denied" description="Only administrators and managers can manage payments."><NewPaymentPageContent /></AdminOnly>;
}
