"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export type EntityModalTone = "green" | "red" | "indigo" | "blue" | "purple";

export interface EntityModalUser {
  name: string;
  email: string;
  role?: string;
}

interface EntityModalProps {
  open: boolean;
  onClose?: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  headerIcon: ReactNode;
  tone?: EntityModalTone;
  user?: EntityModalUser | null;
  userBadge?: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  children?: ReactNode;
}

/**
 * Reusable entity action modal — matches the Opsly modal reference:
 * icon + title + subtitle header, user card, content body,
 * Cancel + colored confirm footer. Light/dark aware.
 */
export function EntityModal({
  open,
  onClose,
  onConfirm,
  title,
  subtitle,
  headerIcon,
  tone = "blue",
  user,
  userBadge,
  confirmLabel,
  cancelLabel = "Cancel",
  loading = false,
  children,
}: EntityModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={loading ? undefined : onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md animate-pop-in rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0b1330] dark:shadow-black/50"
      >
        {onClose && (
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={loading}
            className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X className="size-4" />
          </button>
        )}

        <div className="flex items-start gap-3 pr-6">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", TONE_ICON[tone])}>
            {headerIcon}
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>

        {user && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <Avatar name={user.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
            {(userBadge ?? user.role) && (
              <span className="shrink-0 rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                {userBadge ?? user.role}
              </span>
            )}
          </div>
        )}

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-5 flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 rounded-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className={cn("flex-1 rounded-xl font-semibold text-white", TONE_BUTTON[tone])}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

const TONE_ICON: Record<EntityModalTone, string> = {
  green: "bg-emerald-500 text-white",
  red: "bg-rose-600 text-white",
  indigo: "bg-indigo-600 text-white",
  blue: "bg-blue-600 text-white",
  purple: "bg-violet-600 text-white",
};

const TONE_BUTTON: Record<EntityModalTone, string> = {
  green: "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400",
  red: "bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-400",
  indigo: "bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400",
  blue: "bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400",
  purple: "bg-violet-600 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400",
};
