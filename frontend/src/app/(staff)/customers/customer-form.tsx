"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, MapPin, Phone, User, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/components/providers/toast-provider";
import { EntityFormShell } from "@/components/ui/entity-form";
import { Input } from "@/components/ui/input";
import { customerApi, ApiError } from "@/lib/api";
import { isValidPhone, PHONE_ERROR_MESSAGE } from "@/lib/validation";
import type { CustomerInput } from "@/types";

const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .refine(isValidPhone, { message: PHONE_ERROR_MESSAGE }),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  companyName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  /** Pass to edit an existing customer; omit to create one */
  selfService?: boolean;
  customerId?: number;
  defaultValues?: Partial<CustomerFormValues>;
  submitLabel: string;
}

/** Field help text — mirrors the reference modal cards (heading + description) */
const FIELD_HINTS: Record<keyof CustomerFormValues, { helper: string }> = {
  name: { helper: "Shown on jobs, invoices and lists." },
  phone: { helper: "Used for job updates and reminders." },
  email: { helper: "Required — used for portal login and invoices." },
  companyName: { helper: "Fill only for business customers." },
  address: { helper: "Street address for site visits." },
  city: { helper: "Used for filtering and reports." },
};

/** Shared create / update form for customer records */
export function CustomerForm({ customerId, selfService = false, defaultValues, submitLabel }: CustomerFormProps) {
  const toast = useToast();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      companyName: "",
      address: "",
      city: "",
      ...defaultValues,
    },
  });

  const onSubmit = async (values: CustomerFormValues) => {
    setFormError(null);
    const input: CustomerInput = {
      name: values.name,
      phone: values.phone,
      email: values.email,
      companyName: values.companyName || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
    };
    try {
      const saved = selfService
        ? await customerApi.updateMyProfile(input)
        : customerId
        ? await customerApi.update(customerId, input)
        : await customerApi.create(input);
      toast.success(
        selfService ? "Profile updated" : customerId ? "Customer updated" : "Customer created",
        `${saved.name} saved successfully.`
      );
      router.push(selfService ? "/customer/profile" : "/customers");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof CustomerFormValues, { message });
        }
      } else {
        setFormError(error instanceof ApiError ? error.message : "Unexpected error. Please try again.");
      }
    }
  };

  return (
    <EntityFormShell
      icon={customerId ? <User className="size-5" /> : <UserPlus className="size-5" />}
      tone={customerId ? "blue" : "indigo"}
      title={selfService ? "Edit Profile" : customerId ? "Update Customer" : "Add Customer"}
      subtitle={
        selfService ? "Update your contact details. This does not change your login email." : customerId
          ? "Edit the customer record — changes apply to future jobs"
          : "Create a new customer record for jobs and billing"
      }
      backHref={selfService ? "/customer/profile" : "/customers"}
      backLabel={selfService ? "Back to profile" : "Back to customers"}
      sectionTitle="Customer Details"
      onSubmit={() => void handleSubmit(onSubmit)()}
      submitting={isSubmitting}
      submitLabel={submitLabel}
      submitIcon={customerId ? <User className="size-4" /> : <UserPlus className="size-4" />}
    >
      {formError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:col-span-2 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {formError}
        </div>
      )}

      <Input
        label="Full name"
        required
        autoComplete="name"
        placeholder="Jane Smith"
        icon={<User className="size-4" />}
        hint={FIELD_HINTS.name.helper}
        error={errors.name?.message}
        {...registerField("name")}
      />
      <Input
        label="Phone"
        required
        type="tel"
        autoComplete="tel"
        placeholder="+1 555 000 1234"
        icon={<Phone className="size-4" />}
        hint={FIELD_HINTS.phone.helper}
        error={errors.phone?.message}
        {...registerField("phone")}
      />
      <Input
        label="Email"
        required
        type="email"
        autoComplete="email"
        placeholder="jane@example.com"
        icon={<Mail className="size-4" />}
        hint={FIELD_HINTS.email.helper}
        error={errors.email?.message}
        {...registerField("email")}
      />
      <Input
        label="Company name (optional)"
        placeholder="Acme Corp"
        hint={FIELD_HINTS.companyName.helper}
        error={errors.companyName?.message}
        {...registerField("companyName")}
      />
      <Input
        label="Address (optional)"
        placeholder="12, MG Road"
        icon={<MapPin className="size-4" />}
        hint={FIELD_HINTS.address.helper}
        error={errors.address?.message}
        {...registerField("address")}
      />
      <Input
        label="City (optional)"
        placeholder="Indore"
        hint={FIELD_HINTS.city.helper}
        error={errors.city?.message}
        {...registerField("city")}
      />
    </EntityFormShell>
  );
}
