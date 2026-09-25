"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Wallet } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminOnly } from "@/components/admin-only";
import { useToast } from "@/components/providers/toast-provider";
import { EntityFormShell } from "@/components/ui/entity-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ErrorState, FormSkeleton } from "@/components/ui/states";
import { ApiError, paymentApi } from "@/lib/api";
import type { Payment } from "@/types";

const schema = z.object({
  amount: z.string().min(1, "Amount is required").refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "Enter a positive amount"),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"]),
  transactionReference: z.string().optional(),
});
type Values = z.infer<typeof schema>;

function EditPaymentContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", paymentMethod: "CASH", transactionReference: "" },
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    paymentApi.getById(id).then((data) => {
      if (cancelled) return;
      setPayment(data);
      reset({ amount: String(data.amount), paymentMethod: data.paymentMethod, transactionReference: data.transactionReference ?? "" });
    }).catch((err: unknown) => {
      if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load payment.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, reset, attempt]);

  const submit = async (values: Values) => {
    if (!payment) return;
    setFormError(null);
    try {
      await paymentApi.update(payment.id, {
        invoiceId: payment.invoiceId,
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
        transactionReference: values.transactionReference || undefined,
      });
      toast.success("Payment updated", "The invoice balance has been recalculated.");
      router.push("/payments");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          if (field === "amount" || field === "paymentMethod" || field === "transactionReference") setError(field, { message });
        }
      }
      setFormError(err instanceof ApiError ? err.message : "Failed to update payment.");
    }
  };

  if (loading) return <FormSkeleton label="Loading payment form" fields={4} />;
  if (loadError || !payment) return <ErrorState message={loadError ?? "Payment not found."} onRetry={() => setAttempt((value) => value + 1)} />;
  return <EntityFormShell icon={<Wallet className="size-5" />} tone="emerald" title="Edit Payment"
    subtitle="Correct payment details. The linked invoice cannot be changed."
    backHref="/payments" backLabel="Back to payments" sectionTitle="Payment Details"
    onSubmit={() => void handleSubmit(submit)()} submitting={isSubmitting} submitLabel="Save changes">
    {formError && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{formError}</p>}
    <Input label="Invoice" value={payment.invoiceNumber} readOnly />
    <Input label="Amount (₹)" type="number" min="0.01" step="0.01" error={errors.amount?.message} {...register("amount")} />
    <Select label="Payment method" error={errors.paymentMethod?.message} {...register("paymentMethod")}>
      <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank transfer</option>
    </Select>
    <Input label="Transaction reference (optional)" error={errors.transactionReference?.message} {...register("transactionReference")} />
  </EntityFormShell>;
}

export default function EditPaymentPage() {
  return <AdminOnly roles={["ADMIN", "MANAGER"]} title="Access denied" description="Only administrators and managers can manage payments."><EditPaymentContent /></AdminOnly>;
}
