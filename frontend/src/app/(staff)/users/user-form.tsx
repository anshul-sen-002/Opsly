"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail, Phone, ShieldCheck, User, UserPlus, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/components/providers/toast-provider";
import { EntityFormShell } from "@/components/ui/entity-form";
import { Input, PasswordInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError, staffApi, userProfileApi } from "@/lib/api";
import { isValidPhone, PHONE_ERROR_MESSAGE } from "@/lib/validation";
import type { StaffRole } from "@/types";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin — full system access" },
  { value: "MANAGER", label: "Manager — operations without admin settings" },
  { value: "TECHNICIAN", label: "Technician — field service staff" },
];

interface UserFormValues {
  name: string;
  email: string;
  password?: string;
  role: StaffRole;
  phone?: string;
  specialization?: string;
}

interface UserFormProps {
  /** Pass to edit an existing account; omit to create one */
  userId?: number;
  selfService?: boolean;
  defaultValues?: Partial<UserFormValues>;
  submitLabel: string;
}

/** Shared Add / Edit page for staff accounts (PUT /api/admin/staff/{id} on edit) */
export function UserForm({ userId, selfService = false, defaultValues, submitLabel }: UserFormProps) {
  const toast = useToast();
  const router = useRouter();
  const isEdit = userId !== undefined;
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(2, "Name must be at least 2 characters"),
          email: z.string().min(1, "Email is required").email("Enter a valid email address"),
          password: isEdit
            ? z.string().optional()
            : z.string().min(6, "Password must be at least 6 characters"),
          role: z.enum(["ADMIN", "MANAGER", "TECHNICIAN"], { message: "Select a role" }),
          // Optional for every staff role, but when supplied it must look like a real number
          phone: z
            .string()
            .trim()
            .refine((value) => value === "" || isValidPhone(value), { message: PHONE_ERROR_MESSAGE })
            .optional(),
          specialization: z.string().optional(),
        })
        .refine(
          (values) => values.role !== "TECHNICIAN" || (values.specialization ?? "").trim().length > 0,
          { message: "Specialization is required for technicians", path: ["specialization"] }
        ),
    [isEdit]
  );

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "TECHNICIAN",
      phone: "",
      specialization: "",
      ...defaultValues,
    },
  });

  const role = watch("role");

  const onSubmit = async (values: UserFormValues) => {
    setFormError(null);
    try {
      if (selfService && isEdit) {
        await userProfileApi.update({
          name: values.name,
          phone: values.phone,
          specialization: values.specialization,
        });
        toast.success("Profile updated", "Your profile has been saved.");
      } else if (isEdit && userId !== undefined) {
        await staffApi.update(userId, {
          name: values.name,
          email: values.email,
          role: values.role,
          phone: values.phone || undefined,
          specialization: values.role === "TECHNICIAN" ? values.specialization || undefined : undefined,
        });
        toast.success("User updated", `${values.email} saved successfully.`);
      } else {
        await staffApi.create({
          name: values.name,
          email: values.email,
          password: values.password ?? "",
          role: values.role,
          phone: values.phone || undefined,
          specialization: values.role === "TECHNICIAN" ? values.specialization || undefined : undefined,
        });
        toast.success("User created", `${values.email} can now sign in.`);
      }
      router.push(selfService ? `/users/${userId}` : "/users");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof UserFormValues, { message });
        }
      } else {
        setFormError(error instanceof ApiError ? error.message : "Unexpected error. Please try again.");
      }
    }
  };

  return (
    <EntityFormShell
      icon={isEdit ? <User className="size-5" /> : <UserPlus className="size-5" />}
      tone={isEdit ? "blue" : "indigo"}
      title={selfService ? "Edit Profile" : isEdit ? "Edit User" : "Add User"}
      subtitle={
        selfService ? "Update your name, phone and specialization" : isEdit
          ? "Update account details, role and the linked technician profile"
          : "Create a new staff account — they can sign in immediately"
      }
      sectionTitle="User Details"
      backHref={selfService ? `/users/${userId}` : "/users"}
      backLabel={selfService ? "Back to profile" : "Back to users"}
      avatarName={watch("email") || watch("name") || "New user"}
      avatarBadge={role}
      onSubmit={() => void handleSubmit(onSubmit)()}
      submitting={isSubmitting}
      submitLabel={submitLabel}
      submitIcon={isEdit ? <User className="size-4" /> : <UserPlus className="size-4" />}
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
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="Email address"
        readOnly={selfService}
        required
        type="email"
        autoComplete="email"
        placeholder="jane@company.com"
        icon={<Mail className="size-4" />}
        error={errors.email?.message}
        {...register("email")}
      />
      {!selfService && <Select label="Role" required icon={<ShieldCheck className="size-4" />} error={errors.role?.message} {...register("role")}>
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>}
      <Input
        label="Phone (optional)"
        type="tel"
        autoComplete="tel"
        placeholder="+1 555 000 1234"
        icon={<Phone className="size-4" />}
        error={errors.phone?.message}
        {...register("phone")}
      />
      {role === "TECHNICIAN" && (
        <Input
          label="Specialization"
          placeholder="e.g. HVAC, Electrical, Plumbing"
          icon={<Wrench className="size-4" />}
          hint="Comma separated — shown as skill chips on the profile"
          error={errors.specialization?.message}
          {...register("specialization")}
        />
      )}
      {!isEdit && (
        <PasswordInput
          label="Temporary password"
          required
          icon={<Lock className="size-4" />}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          hint="Share it with the user — they'll use it to sign in."
          error={errors.password?.message}
          {...register("password")}
        />
      )}
    </EntityFormShell>
  );
}