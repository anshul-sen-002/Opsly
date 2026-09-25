"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthFormHeader } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { isValidPhone, PHONE_ERROR_MESSAGE } from "@/lib/validation";
import { Mail, Phone, User } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .min(1, "Phone is required")
      .refine(isValidPhone, { message: PHONE_ERROR_MESSAGE }),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function CustomerRegisterPage() {
  const { registerCustomer } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterForm) => {
    setFormError(null);
    try {
      await registerCustomer({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      });
      // Store flag to show welcome toast on dashboard
      try {
        localStorage.setItem('opsly.showWelcomeToast', 'true');
      } catch {
        // storage unavailable
      }
      router.replace("/customer/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors) {
          for (const [field, message] of Object.entries(error.fieldErrors)) {
            setError(field as keyof RegisterForm, { message });
          }
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Unexpected error. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <AuthFormHeader
        pill="New here?"
        title="Create your account"
        subtitle="Register as a customer to request services and follow your jobs."
      />

      {formError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Jane Smith"
          icon={<User className="size-4" />}
          error={errors.name?.message}
          {...registerField("name")}
        />
        <Input
          label="Email address"
          required
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="size-4" />}
          error={errors.email?.message}
          {...registerField("email")}
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 000 1234"
          icon={<Phone className="size-4" />}
          error={errors.phone?.message}
          {...registerField("phone")}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          error={errors.password?.message}
          {...registerField("password")}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          error={errors.confirmPassword?.message}
          {...registerField("confirmPassword")}
        />
        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="w-full"
        >
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          href="/customer/login"
          className="font-semibold text-indigo-600 underline decoration-indigo-300 decoration-2 underline-offset-2 transition hover:text-indigo-700 hover:decoration-indigo-500 dark:text-indigo-400 dark:decoration-indigo-500/40 dark:hover:text-indigo-300 dark:hover:decoration-indigo-400"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
