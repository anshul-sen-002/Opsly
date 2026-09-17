"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, CalendarClock, User, Users, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/components/providers/toast-provider";
import { EntityFormShell } from "@/components/ui/entity-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError, customerApi, jobApi } from "@/lib/api";
import type { Customer, CreateJobInput } from "@/types";

const jobSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  description: z.string().min(5, "Describe the work in at least 5 characters"),
  scheduledAt: z.string().optional(),
});

type JobFormValues = z.infer<typeof jobSchema>;

export default function NewJobPage() {
  const toast = useToast();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: { customerId: "", description: "", scheduledAt: "" },
  });

  useEffect(() => {
    let cancelled = false;
    customerApi
      .list(0, 100, "name,asc")
      .then((page) => {
        if (!cancelled) setCustomers(page.content);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Failed to load customers.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCustomers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (values: JobFormValues) => {
    setFormError(null);
    const input: CreateJobInput = {
      customerId: Number(values.customerId),
      description: values.description,
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : undefined,
    };
    try {
      const saved = await jobApi.create(input);
      toast.success("Job created", `Job #${saved.id} logged for ${saved.customerName}.`);
      router.push("/jobs");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof JobFormValues, { message });
        }
      } else {
        setFormError(error instanceof ApiError ? error.message : "Unexpected error. Please try again.");
      }
    }
  };

  return (
    <EntityFormShell
      icon={<Wrench className="size-5" />}
      tone="indigo"
      title="New Job"
      subtitle="Log a service request — a manager can assign a technician afterwards"
      backHref="/jobs"
      backLabel="Back to jobs"
      sectionTitle="Job Details"
      onSubmit={() => void handleSubmit(onSubmit)()}
      submitting={isSubmitting}
      submitLabel="Create job"
      submitIcon={<Briefcase className="size-4" />}
    >
      {formError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:col-span-2 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {formError}
        </div>
      )}
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 sm:col-span-2 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {loadError}
        </div>
      )}

      <Select
        label="Customer"
        required
        icon={<Users className="size-4" />}
        placeholder={loadingCustomers ? "Loading customers..." : "Select a customer"}
        disabled={loadingCustomers}
        error={errors.customerId?.message}
        {...registerField("customerId")}
      >
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
            {customer.city ? ` — ${customer.city}` : ""}
          </option>
        ))}
      </Select>

      <Input
        label="Preferred date (optional)"
        type="datetime-local"
        icon={<CalendarClock className="size-4" />}
        error={errors.scheduledAt?.message}
        {...registerField("scheduledAt")}
      />

      <div className="sm:col-span-2">
        <label className="block text-sm font-semibold text-[#16294d] dark:text-slate-200">
          Work description <span className="font-bold text-rose-500">*</span>
        </label>
        <textarea
          rows={4}
          placeholder="Describe the fault, the site and any access notes."
          className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
          {...registerField("description")}
        />
        {errors.description ? (
          <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
            {errors.description.message}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Shown to the technician and on the invoice.
          </p>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-400 sm:col-span-2 dark:text-slate-500">
        <User className="size-3.5" />
        The job starts in PENDING until a manager assigns a technician.
      </p>
    </EntityFormShell>
  );
}