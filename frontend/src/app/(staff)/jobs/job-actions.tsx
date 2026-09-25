"use client";

import { CheckCircle2, Lock, PlayCircle, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { useNotifications } from "@/components/providers/notification-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EntityModal } from "@/components/ui/entity-modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/states";
import { ApiError, jobApi, technicianApi } from "@/lib/api";
import { signalNotificationsChanged } from "@/lib/utils";
import type { Job, Technician } from "@/types";

type JobTransitionAction = "start" | "complete" | "close";

interface TransitionState {
  action: JobTransitionAction;
  job: Job;
}

const COPY: Record<
  JobTransitionAction,
  {
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "warning" | "primary";
    badge: string;
  }
> = {
  start: {
    title: "Start this job?",
    message: "The job moves to In Progress so the customer knows the technician has begun.",
    confirmLabel: "Start job",
    variant: "primary",
    badge: "In Progress",
  },
  complete: {
    title: "Mark this job complete?",
    message: "The job moves to Completed and becomes ready for review and closing.",
    confirmLabel: "Mark complete",
    variant: "warning",
    badge: "Completed",
  },
  close: {
    title: "Close this job?",
    message: "Closing is final - the job can then be invoiced. This cannot be undone.",
    confirmLabel: "Close job",
    variant: "danger",
    badge: "Closed",
  },
};

/** Entity card shown inside the job dialogs - customer name + job context */
export function jobDialogUser(job: Job) {
  return {
    name: job.customerName,
    email: job.description,
    role: `#${job.id} · ${job.status.replace(/_/g, " ")}`,
  };
}


/**
 * Shared job transition dialogs (start / complete / close) plus the
 * assign-technician picker. `onUpdated` refreshes the caller's list.
 */
export function useJobActions(onUpdated: () => void | Promise<unknown>) {
  const toast = useToast();
  const { refresh: refreshNotifications } = useNotifications();
  const [pending, setPending] = useState<TransitionState | null>(null);
  const [assignJob, setAssignJob] = useState<Job | null>(null);

  const run = useCallback(
    async (state: TransitionState) => {
      const apiCall =
        state.action === "start"
          ? jobApi.start
          : state.action === "complete"
            ? jobApi.complete
            : jobApi.close;
      try {
        const updated = await apiCall(state.job.id);
        // Status change fires a backend notification (after commit) —
        // refresh the bell so OTHER roles see it without waiting 45s
        refreshNotifications();
        signalNotificationsChanged();
        await onUpdated();
        // Close-first contract: ConfirmDialog fires this toast AFTER closing.
        return {
          title: `Job #${updated.id} updated`,
          description: `Status is now ${updated.status.replace(/_/g, " ")}.`,
        };
      } catch (err) {
        toast.error("Action failed", err instanceof ApiError ? err.message : "Unexpected error");
        throw err;
      }
    },
    [onUpdated, toast, refreshNotifications]
  );

  const request = useCallback(
    (action: JobTransitionAction, job: Job) => setPending({ action, job }),
    []
  );

  /** Opens the assign-technician picker for a PENDING job */
  const requestAssign = useCallback((job: Job) => setAssignJob(job), []);

  const copy = pending ? COPY[pending.action] : null;

  const dialog = (
    <>
      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={copy?.title ?? ""}
        message={copy?.message ?? ""}
        confirmLabel={copy?.confirmLabel ?? "Confirm"}
        variant={copy?.variant ?? "warning"}
        user={pending ? jobDialogUser(pending.job) : null}
        userBadge={copy?.badge}
        icon={
          pending?.action === "start" ? (
            <PlayCircle className="size-5" />
          ) : pending?.action === "complete" ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Lock className="size-5" />
          )
        }
        onConfirm={() => (pending ? run(pending) : Promise.resolve())}
      />
      <AssignTechnicianModal
        job={assignJob}
        onClose={() => setAssignJob(null)}
        onAssigned={onUpdated}
      />
    </>
  );

  return { request, requestAssign, dialog };
}
function AssignTechnicianModal({
  job,
  onClose,
  onAssigned,
}: {
  job: Job | null;
  onClose: () => void;
  onAssigned: () => void | Promise<unknown>;
}) {
  const toast = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [technicianId, setTechnicianId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    setTechnicianId("");
    setLoading(true);
    setLoadError(null);
    technicianApi
      .list(0, 100)
      .then((page) => {
        if (!cancelled) setTechnicians(page.content);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Failed to load technicians.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [job]);

  const confirm = async () => {
    if (!job || !technicianId) return;
    setSaving(true);
    try {
      const updated = await jobApi.assignTechnician(job.id, Number(technicianId));
      signalNotificationsChanged();
      await onAssigned();
      // Close FIRST so the success toast renders after the modal is gone.
      onClose();
      toast.success(
        "Technician assigned",
        `Job #${updated.id} assigned to ${updated.technicianName ?? "technician"}.`
      );
    } catch (err) {
      toast.error("Assignment failed", err instanceof ApiError ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityModal
      open={job !== null}
      onClose={saving ? undefined : onClose}
      onConfirm={() => void confirm()}
      title="Assign Technician"
      subtitle="Choose the field technician who will handle this job"
      headerIcon={<UserCheck className="size-5" />}
      tone="blue"
      user={job ? jobDialogUser(job) : null}
      confirmLabel="Assign"
      loading={saving}
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : loadError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {loadError}
        </p>
      ) : technicians.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No technicians available yet. Create a technician account from the Users page first.
        </p>
      ) : (
        <Select
          label="Technician"
          placeholder="Select a technician"
          value={technicianId}
          onChange={(event) => setTechnicianId(event.target.value)}
        >
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {technician.name}
              {technician.specialization ? ` - ${technician.specialization}` : ""}
            </option>
          ))}
        </Select>
      )}
    </EntityModal>
  );
}