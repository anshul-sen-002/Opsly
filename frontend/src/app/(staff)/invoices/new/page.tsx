"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, IndianRupee, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/components/providers/toast-provider";
import { EntityFormShell } from "@/components/ui/entity-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { ApiError, invoiceApi, jobApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Job } from "@/types";

const invoiceSchema = z.object({
  jobId: z.string().min(1, "Select a closed job"),
  subtotal: z
    .string()
    .min(1, "Subtotal is required")
    .refine((value) => Number(value) > 0, "Subtotal must be greater than 0"),
  tax: z
    .string()
    .optional()
    .refine((value) => !value || Number(value) >= 0, "Tax cannot be negative"),
  dueDate: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

function NewInvoicePageContent() {
  const toast = useToast();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { jobId: "", subtotal: "", tax: "", dueDate: "" },
  });

  const selectedJobId = watch("jobId");
  const selectedJob = jobs.find((job) => String(job.id) === selectedJobId);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Invoices can only be created for CLOSED jobs
      const data = await jobApi.list(0, 100, "createdAt,desc", "CLOSED");
      setJobs(data.content);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load closed jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const onSubmit = async (values: InvoiceFormValues) => {
    setFormError(null);
    try {
      const created = await invoiceApi.create({
        jobId: Number(values.jobId),
        subtotal: Number(values.subtotal),
        tax: values.tax ? Number(values.tax) : undefined,
        dueDate: values.dueDate || undefined,
      });
      toast.success(
        "Invoice created",
        `${created.invoiceNumber} saved as a draft — issue it to make it payable.`
      );
      router.push(`/invoices/${created.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof InvoiceFormValues, { message });
        }
      } else {
        setFormError(error instanceof ApiError ? error.message : "Unexpected error. Please try again.");
      }
    }
  };

  if (loading) return <PageLoader />;

  if (loadError) {
    return <ErrorState title="Could not load closed jobs" message={loadError} onRetry={() => void loadJobs()} />;
  }

  return (
    <EntityFormShell
      icon={<Receipt className="size-5" />}
      tone="blue"
      title="New Invoice"
      subtitle="Raise billing against a closed job — invoices start as drafts"
      backHref="/invoices"
      backLabel="Back to invoices"
      sectionTitle="Invoice Details"
      onSubmit={() => void handleSubmit(onSubmit)()}
      submitting={isSubmitting}
      submitLabel="Create invoice"
      submitIcon={<Receipt className="size-4" />}
    >
      {formError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:col-span-2 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {formError}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 sm:col-span-2 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          No closed jobs yet — close a job first, then create its invoice.
        </div>
      ) : (
        <Select label="Closed job" error={errors.jobId?.message} {...register("jobId")}>
          <option value="">Select a closed job</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {`#JOB-${job.id} · ${job.customerName}`}
            </option>
          ))}
        </Select>
      )}

      {selectedJob && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:col-span-2 dark:border-slate-800 dark:bg-white/5">
          <p className="font-medium text-slate-900 dark:text-white">{selectedJob.description}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {selectedJob.customerName} · closed job created {formatDate(selectedJob.createdAt)}
          </p>
        </div>
      )}

      <Input
        label="Subtotal (₹)"
        type="number"
        min="0"
        step="0.01"
        placeholder="e.g. 2500"
        icon={<IndianRupee className="size-4" />}
        error={errors.subtotal?.message}
        {...register("subtotal")}
      />
      <Input
        label="Tax (₹, optional)"
        type="number"
        min="0"
        step="0.01"
        placeholder="e.g. 450"
        error={errors.tax?.message}
        {...register("tax")}
      />
      <Input
        label="Due date (optional)"
        type="date"
        icon={<CalendarDays className="size-4" />}
        error={errors.dueDate?.message}
        {...register("dueDate")}
      />
    </EntityFormShell>
  );
}

export default function NewInvoicePage() {
  return <NewInvoicePageContent />;
}
