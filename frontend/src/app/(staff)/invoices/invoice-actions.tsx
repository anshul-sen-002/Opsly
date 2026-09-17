"use client";

import { Receipt } from "lucide-react";
import { useCallback, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError, invoiceApi } from "@/lib/api";
import type { Invoice } from "@/types";

/** Invoice card shown inside the dialogs */
export function invoiceDialogUser(invoice: Invoice) {
  return {
    name: invoice.invoiceNumber,
    email: invoice.customerName,
    role: invoice.status.replace(/_/g, " "),
  };
}

/**
 * Shared invoice action flow (issue). `onUpdated` refreshes the caller's list.
 */
export function useInvoiceActions(onUpdated: () => void | Promise<unknown>) {
  const toast = useToast();
  const [pending, setPending] = useState<Invoice | null>(null);

  const run = useCallback(
    async (invoice: Invoice) => {
      try {
        const updated = await invoiceApi.issue(invoice.id);
        toast.success(
          `Invoice ${updated.invoiceNumber} issued`,
          "The invoice is now payable and payments can be recorded."
        );
        await onUpdated();
      } catch (err) {
        toast.error("Could not issue invoice", err instanceof ApiError ? err.message : "Unexpected error");
        throw err;
      }
    },
    [onUpdated, toast]
  );

  const request = useCallback((invoice: Invoice) => setPending(invoice), []);

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      onClose={() => setPending(null)}
      title="Issue this invoice?"
      message="Issuing makes the invoice payable. Once issued it can no longer be edited."
      confirmLabel="Issue invoice"
      variant="warning"
      user={pending ? invoiceDialogUser(pending) : null}
      userBadge="Issued"
      icon={<Receipt className="size-5" />}
      onConfirm={() => (pending ? run(pending) : Promise.resolve())}
    />
  );

  return { request, dialog };
}