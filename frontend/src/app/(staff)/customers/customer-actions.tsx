"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { customerApi, ApiError } from "@/lib/api";
import type { Customer } from "@/types";

export type CustomerAction = "delete" | "restore";

interface CustomerActionState {
  action: CustomerAction;
  customer: Customer;
}

const COPY: Record<
  CustomerAction,
  { title: string; message: string; confirmLabel: string; variant: "danger" | "warning" | "primary"; badge: string }
> = {
  delete: {
    title: "Delete this customer?",
    message: "This record will be moved to trash — you can restore it later from the Deleted tab.",
    confirmLabel: "Delete",
    variant: "danger",
    badge: "Trash",
  },
  restore: {
    title: "Restore this customer?",
    message: "This record will become active again and appear in the active list.",
    confirmLabel: "Restore",
    variant: "primary",
    badge: "Active",
  },
};

/** Shared soft-delete / restore flow for the customers pages */
export function useCustomerActions(onUpdated: (customer: Customer) => void | Promise<unknown>) {
  const toast = useToast();
  const [pending, setPending] = useState<CustomerActionState | null>(null);

  const run = useCallback(
    async (state: CustomerActionState) => {
      try {
        const updated =
          state.action === "delete"
            ? await customerApi.remove(state.customer.id)
            : await customerApi.restore(state.customer.id);
        toast.success(
          state.action === "delete" ? "Customer deleted" : "Customer restored",
          `${updated.name} — ${state.action === "delete" ? "moved to trash" : "record restored"}.`
        );
        await onUpdated(updated);
      } catch (err) {
        toast.error("Action failed", err instanceof ApiError ? err.message : "Unexpected error");
        throw err;
      }
    },
    [onUpdated, toast]
  );

  /** Opens the confirmation dialog for an action */
  const request = useCallback(
    (action: CustomerAction, customer: Customer) => setPending({ action, customer }),
    []
  );

  const copy = pending ? COPY[pending.action] : null;

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      onClose={() => setPending(null)}
      title={copy?.title ?? ""}
      message={copy?.message ?? ""}
      confirmLabel={copy?.confirmLabel ?? "Confirm"}
      variant={copy?.variant ?? "warning"}
      user={
        pending
          ? {
              name: pending.customer.name,
              email: pending.customer.email ?? pending.customer.phone,
              role: pending.customer.companyName ?? undefined,
            }
          : null
      }
      userBadge={copy?.badge}
      icon={
        pending?.action === "delete" ? <Trash2 className="size-5" /> : <RotateCcw className="size-5" />
      }
      onConfirm={() => (pending ? run(pending) : Promise.resolve())}
    />
  );

  return { request, dialog };
}
