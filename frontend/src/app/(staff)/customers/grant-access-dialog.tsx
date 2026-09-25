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
 *
 * The email field is DISABLED and locked to the customer's contact email, so
 * the login account (`users.email`) is always created with the exact email
 * already on the customer record — no divergence between contact and login.
 * Email is required on customer records, so the field is always locked; the
 * editable fallback only covers legacy rows created before email became
 * mandatory.
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
  // The login email is locked to the customer's contact email so the same value
  // ends up in both `customers.email` and `users.email` — the field is disabled
  // and the submit always sends `lockedEmail`. Only when the customer record has
  // no contact email at all does the field stay editable (otherwise grant-access
  // could never succeed, the API requires a non-blank email).
  const lockedEmail = (customer.email ?? "").trim();
  const emailLocked = lockedEmail.length > 0;
  const [email, setEmail] = useState(lockedEmail);
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(null);

    // Locked field: always the customer's contact email, never typed input
    const trimmedEmail = emailLocked ? lockedEmail : email.trim();
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
      // Close FIRST so the success toast renders after the modal is gone.
      onGranted(updated);
      toast.success("Portal access granted", `${updated.name} can now sign in at /customer/login.`);
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
        {emailLocked
          ? `This customer will sign in with their contact email (${lockedEmail}) — the login email is locked so it always matches the customer record. Set a password below.`
          : "This customer has no contact email on their record. Enter the login email they will use, plus a password."}
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
          value={emailLocked ? lockedEmail : email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={emailLocked}
          readOnly={emailLocked}
          hint={
            emailLocked
              ? "Locked to the customer's contact email — it cannot be changed here."
              : "No contact email on this customer — type the login email."
          }
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
