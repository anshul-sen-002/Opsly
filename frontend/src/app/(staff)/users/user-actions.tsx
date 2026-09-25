"use client";

import { Ban, CheckCircle2, RotateCcw, Trash2, UserCog } from "lucide-react";
import { useCallback, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EntityModal } from "@/components/ui/entity-modal";
import { Select } from "@/components/ui/select";
import { staffApi, ApiError } from "@/lib/api";
import { displayNameFromEmail } from "@/lib/utils";
import type { Staff, StaffRole } from "@/types";

export type UserAction = "activate" | "deactivate" | "delete" | "restore";

interface UserActionState {
  action: UserAction;
  user: Staff;
}

const COPY: Record<
  UserAction,
  { title: string; message: string; confirmLabel: string; variant: "danger" | "warning" | "primary"; badge: string; disabledRoles?: string[] }
> = {
  activate: {
    title: "Activate this user?",
    message: "This user will be granted access — they can sign in and use the platform again.",
    confirmLabel: "Activate",
    variant: "primary",
    badge: "Active",
  },
  deactivate: {
    title: "Deactivate this user?",
    message: "This user will be temporarily blocked — they won't be able to sign in until reactivated.",
    confirmLabel: "Deactivate",
    variant: "warning",
    badge: "Inactive",
    disabledRoles: ["ADMIN"], // admin accounts cannot be deactivated
  },
  delete: {
    title: "Delete this user?",
    message: "This user will be moved to trash — you can restore them later from the Deleted tab.",
    confirmLabel: "Delete",
    variant: "danger",
    badge: "Trash",
  },
  restore: {
    title: "Restore this user?",
    message: "This user will be restored to the active list with full access.",
    confirmLabel: "Restore",
    variant: "primary",
    badge: "Active",
  },
};

/**
 * Shared activate / deactivate / delete / restore flow for the staff pages.
 * `onUpdated` receives the updated user so the caller can refresh its view.
 */
export function useUserActions(onUpdated: (user: Staff) => void | Promise<unknown>) {
  const toast = useToast();
  const [pending, setPending] = useState<UserActionState | null>(null);

  const run = useCallback(
    async (state: UserActionState) => {
      const apiCall =
        state.action === "activate"
          ? staffApi.activate
          : state.action === "deactivate"
            ? staffApi.deactivate
            : state.action === "delete"
              ? staffApi.remove
              : staffApi.restore;
      try {
        const updated = await apiCall(state.user.id);
        const fresh =
          state.action === "activate" || state.action === "deactivate"
            ? await staffApi.getById(state.user.id).catch(() => updated)
            : updated;
        await onUpdated(fresh);
        // Close-first contract: ConfirmDialog fires this toast AFTER closing.
        return {
          title: state.action === "delete" ? "User deleted" : `User ${state.action}d`,
          description: `${fresh.email} — ${state.action === "delete" ? "moved to trash" : state.action === "restore" ? "account restored" : `status is now ${fresh.status}`}.`,
        };
      } catch (err) {
        toast.error("Action failed", err instanceof ApiError ? err.message : "Unexpected error");
        throw err;
      }
    },
    [onUpdated, toast]
  );

  /** Opens the confirmation dialog for an action */
  const request = useCallback((action: UserAction, user: Staff) => setPending({ action, user }), []);

  const copy = pending
    ? {
        ...COPY[pending.action],
        disabled: COPY[pending.action].disabledRoles?.includes(pending.user.role),
      }
    : null;

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      onClose={() => setPending(null)}
      title={copy?.title ?? ""}
      message={copy?.message ?? ""}
      confirmLabel={copy?.confirmLabel ?? "Confirm"}
      disabled={pending?.user.role === "ADMIN"}
      variant={copy?.variant ?? "warning"}
      user={
        pending
          ? {
              name: displayNameFromEmail(pending.user.email),
              email: pending.user.email,
              role: pending.user.role,
            }
          : null
      }
      userBadge={copy?.badge}
      icon={
        pending?.action === "delete" ? (
          <Trash2 className="size-5" />
        ) : pending?.action === "restore" ? (
          <RotateCcw className="size-5" />
        ) : pending?.action === "deactivate" ? (
          <Ban className="size-5" />
        ) : pending?.action === "activate" ? (
          <CheckCircle2 className="size-5" />
        ) : undefined
      }
      onConfirm={() => (pending ? run(pending) : Promise.resolve())}
    />
  );

  return { request, dialog };
}

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "ADMIN", label: "Admin — full system access" },
  { value: "MANAGER", label: "Manager — operations without admin settings" },
  { value: "TECHNICIAN", label: "Technician — field service staff" },
];

/**
 * Change-role dialog shared by the actions panel and the profile page.
 * Uses the same PUT /api/admin/staff/{id} endpoint as the edit form,
 * so backend rules (email uniqueness, technician profile sync) still apply.
 */
export function useRoleChange(onUpdated: (user: Staff) => void | Promise<unknown>) {
  const toast = useToast();
  const [target, setTarget] = useState<Staff | null>(null);
  const [role, setRole] = useState<StaffRole>("TECHNICIAN");
  const [saving, setSaving] = useState(false);

  const openFor = useCallback((user: Staff) => {
    setTarget(user);
    setRole(user.role === "CUSTOMER" ? "TECHNICIAN" : user.role);
  }, []);

  const close = useCallback(() => {
    if (!saving) setTarget(null);
  }, [saving]);

  const confirm = useCallback(async () => {
    if (!target) return;
    setSaving(true);
    try {
      const fresh = await staffApi.update(target.id, {
        name: target.name ?? displayNameFromEmail(target.email),
        email: target.email,
        role,
        phone: target.phone ?? undefined,
        specialization: target.specialization ?? undefined,
      });
      // Close FIRST so the success toast renders after the modal is gone.
      setTarget(null);
      toast.success("Role updated", `${fresh.email} — role set to ${fresh.role.toLowerCase()}.`);
      await onUpdated(fresh);
    } catch (err) {
      toast.error("Could not change role", err instanceof ApiError ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  }, [onUpdated, role, target, toast]);

  const dialog = (
    <EntityModal
      open={target !== null}
      onClose={close}
      onConfirm={() => void confirm()}
      title="Change Role"
      subtitle="Permissions update immediately after the role changes."
      headerIcon={<UserCog className="size-5" />}
      tone="indigo"
      user={
        target
          ? { name: target.name ?? displayNameFromEmail(target.email), email: target.email, role: target.role }
          : null
      }
      userBadge={target?.role}
      confirmLabel="Change role"
      loading={saving}
    >
      <Select
        label="New role"
        value={role}
        disabled={saving}
        onChange={(event) => setRole(event.target.value as StaffRole)}
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </EntityModal>
  );

  return { openFor, dialog };
}
