"use client";

import { Briefcase, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/components/providers/toast-provider";
import { EntityFormShell } from "@/components/ui/entity-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError, jobApi } from "@/lib/api";
import type { CreateJobInput, Job } from "@/types";

const requestSchema = z.object({
  description: z.string().min(5, "Describe the work in at least 5 characters"),
  scheduledAt: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function NewRequestPage() {
  const toast = useToast();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedJob, setSavedJob] = useState<Job | null>(null);

  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { description: "", scheduledAt: "" },
  });

  const onSubmit = async (values: RequestFormValues) => {
    setFormError(null);
    const input: CreateJobInput = {
      customerId: 0, // Backend derives customerId from JWT for CUSTOMER role — value is ignored
      description: values.description,
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : undefined,
    };
    try {
      const saved = await jobApi.create(input);
      setSavedJob(saved);
      toast.success("Request raised", `Job #${saved.id} created successfully.`);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof RequestFormValues, { message });
        }
      } else {
        setFormError(error instanceof ApiError ? error.message : "Unexpected error. Please try again.");
      }
    }
  };

  return (
    <EntityFormShell
      icon={<Briefcase className="size-5" />}
      tone="indigo"
      title="New Service Request"
      subtitle="Describe the work you need done — a manager will review and assign a technician."
      backHref="/customer/requests"
      backLabel="Back to my requests"
      sectionTitle="Request Details"
      onSubmit={() => void handleSubmit(onSubmit)()}
      submitting={isSubmitting}
      submitLabel={savedJob ? "Request submitted" : "Raise request"}
      submitIcon={<Briefcase className="size-4" />}
      cancelHref={savedJob ? "/customer/requests" : undefined}
    >
      {formError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:col-span-2 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {formError}
        </div>
      )}

      <div className="sm:col-span-2">
        <label className="block text-sm font-semibold text-[#16294d] dark:text-slate-200">
          Work description <span className="font-bold text-rose-500">*</span>
        </label>
        <textarea
          rows={4}
          placeholder="Describe the fault, the site, and any access notes..."
          className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
          {...registerField("description")}
        />
        {errors.description ? (
          <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
            {errors.description.message}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            This description is shared with the technician and appears on your invoice.
          </p>
        )}
      </div>

      <Input
        label="Preferred date (optional)"
        type="datetime-local"
        icon={<CalendarClock className="size-4" />}
        error={errors.scheduledAt?.message}
        {...registerField("scheduledAt")}
      />

      {savedJob && (
        <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          Your request <span className="font-semibold">#{savedJob.id}</span> has been raised. A manager will review it and assign a technician.
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400 sm:col-span-2 dark:text-slate-500">
        <CalendarClock className="size-3.5" />
        Requests start in PENDING status until a manager assigns a technician.
      </p>
    </EntityFormShell>
  );
}
