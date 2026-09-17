"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthFormHeader } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/providers/toast-provider";
import { displayNameFromEmail } from "@/lib/utils";
import { Mail } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function CustomerLoginPage() {
  const { status, loginCustomer } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (status === "authenticated") router.replace("/customer/dashboard");
  }, [status, router]);

  const onSubmit = async (values: LoginForm) => {
    setFormError(null);
    try {
      await loginCustomer(values.email, values.password);
      toast.success(
        `Welcome, ${displayNameFromEmail(values.email)}!`,
        "Signed in successfully — glad to have you back."
      );
      router.replace("/customer/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors) {
          for (const [field, message] of Object.entries(error.fieldErrors)) {
            setError(field as keyof LoginForm, { message });
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
        pill="Customer Portal"
        title="Customer sign in"
        subtitle="Track your service requests and invoices."
      />

      {formError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="size-4" />}
          error={errors.email?.message}
          {...registerField("email")}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...registerField("password")}
        />
        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="w-full"
        >
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        New to Opsly?{" "}
        <Link
          href="/customer/register"
          className="font-semibold text-indigo-600 underline decoration-indigo-300 decoration-2 underline-offset-2 transition hover:text-indigo-700 hover:decoration-indigo-500 dark:text-indigo-400 dark:decoration-indigo-500/40 dark:hover:text-indigo-300 dark:hover:decoration-indigo-400"
        >
          Create an account
        </Link>
      </p>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Are you a staff member?{" "}
        <Link
          href="/staff/login"
          className="font-semibold text-indigo-600 underline decoration-indigo-300 decoration-2 underline-offset-2 transition hover:text-indigo-700 hover:decoration-indigo-500 dark:text-indigo-400 dark:decoration-indigo-500/40 dark:hover:text-indigo-300 dark:hover:decoration-indigo-400"
        >
          Staff sign in
        </Link>
      </p>
    </div>
  );
}
