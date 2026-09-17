"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { customerApi, ApiError } from "@/lib/api";
import type { Customer } from "@/types";

/**
 * Creates a login account for a staff-created customer (user_id = null) via
 * POST /api/customers/{id}/grant-access. Remount with a `key` per customer so
 * the form resets for each target.
 */
export function GrantAccessDialog({
  customer,
  onClose,
  onGranted,
}: {
  customer: Customer;
  onClose: () => void;
  onGranted: (customer: Customer) => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState(customer.email ?? "");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(null);

    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setFieldError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await customerApi.grantAccess(customer.id, {
        email: trimmedEmail,
        password,
      });
      toast.success("Portal access granted", `${updated.name} can now sign in at /customer/login.`);
      onGranted(updated);
    } catch (err) {
      toast.error(
        "Could not grant access",
        err instanceof ApiError ? err.message : "Unexpected error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={submitting ? undefined : onClose}>
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <KeyRound className="size-5" />
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={customer.name} size="sm" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
              Grant portal access
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {customer.name} · {customer.phone}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        This customer was created by staff and has no login. Set an email and password — they will
        then be able to sign in from the customer portal.
      </p>

      {fieldError && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {fieldError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <Input
          label="Login email"
          type="email"
          autoComplete="off"
          placeholder="customer@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" icon={<KeyRound className="size-4" />} loading={submitting}>
            Grant access
          </Button>
        </div>
      </form>
    </Modal>
  );
}
