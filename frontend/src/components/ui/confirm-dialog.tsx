"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { EntityModal, type EntityModalTone, type EntityModalUser } from "./entity-modal";

type ConfirmVariant = "danger" | "warning" | "primary";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
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
 * Pass an async onConfirm — the dialog manages its own pending state and
 * closes on success. Errors must be handled by the caller (e.g. toast).
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
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      onClose();
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
    />
  );
}

