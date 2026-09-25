"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { EntityModal, type EntityModalTone, type EntityModalUser } from "./entity-modal";

type ConfirmVariant = "danger" | "warning" | "primary";

/** Success toast fired by the dialog AFTER it has closed */
export interface ConfirmToastPayload {
  title: string;
  description?: string;
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Run the API call — return a toast payload to show after the modal closes */
  onConfirm: () => void | ConfirmToastPayload | Promise<void | ConfirmToastPayload>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = delete · warning = status change · primary = restore/activate */
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
  /** Optional entity card (avatar + name + email + role badge) like the reference modals */
  user?: EntityModalUser | null;
  userBadge?: string;
  /** When true, the confirm button is disabled and the dialog cannot be confirmed */
  disabled?: boolean;
}

const VARIANT_TONE: Record<ConfirmVariant, EntityModalTone> = {
  danger: "red",
  warning: "green",
  primary: "indigo",
};

const DEFAULT_LABELS: Record<ConfirmVariant, string> = {
  danger: "Delete",
  warning: "Confirm",
  primary: "Confirm",
};

/**
 * Reusable confirmation modal for destructive or state-changing actions
 * (delete, activate/deactivate, restore...).
 *
 * Close-first contract: async onConfirm performs the API call and RETURNS an
 * optional toast payload { title, description } instead of toasting itself.
 * The dialog manages its own pending state, calls onClose() first, and only
 * then fires the success toast — so the order is always API → modal close →
 * toast. On error, onConfirm should toast the error and rethrow; the dialog
 * keeps itself open (errors are surfaced by the caller above the modal).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "warning",
  icon,
  user,
  userBadge,
  disabled,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const toast = useToast();

  const handleConfirm = async () => {
    setPending(true);
    try {
      const success = await onConfirm();
      // Modal closes FIRST, then the success toast fires — one batched
      // commit, so the toast never renders while the modal is still up.
      onClose();
      if (success) toast.success(success.title, success.description);
    } catch {
      // Error already toasted by the caller — keep the dialog open for retry.
    } finally {
      setPending(false);
    }
  };

  return (
    <EntityModal
      open={open}
      onClose={pending ? undefined : onClose}
      onConfirm={() => void handleConfirm()}
      title={title}
      subtitle={message}
      headerIcon={icon ?? <TriangleAlert className="size-5" />}
      tone={VARIANT_TONE[variant]}
      user={user}
      userBadge={userBadge}
      confirmLabel={pending ? "Working..." : (confirmLabel ?? DEFAULT_LABELS[variant])}
      cancelLabel={cancelLabel}
      loading={pending}
      disabled={disabled}
    />
  );
}

