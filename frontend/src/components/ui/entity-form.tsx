"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ShieldCheck } from "lucide-react";
import { Button } from "./button";
import { cn, initialsOf } from "@/lib/utils";

interface EntityFormShellProps {
  icon: ReactNode;
  tone?: "indigo" | "blue" | "emerald" | "violet";
  title: string;
  subtitle: string;
  sectionTitle?: string;
  backHref: string;
  backLabel?: string;
  avatarName?: string;
  avatarBadge?: string;
  children: ReactNode;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel: string;
  submitIcon?: ReactNode;
  cancelHref?: string;
}

/**
 * Shared Add / Edit page shell — matches the reference design:
 * soft page backdrop, gradient title banner, live preview strip,
 * navy section heading, airy 2-col grid, sticky pill footer.
 * Keeps every entity form (users, customers, jobs…) pixel-consistent.
 */
export function EntityFormShell({
  icon,
  tone = "indigo",
  title,
  subtitle,
  sectionTitle,
  backHref,
  backLabel = "Back to list",
  avatarName,
  avatarBadge,
  children,
  onSubmit,
  submitting = false,
  submitLabel,
  submitIcon,
  cancelHref,
}: EntityFormShellProps) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-24px_rgba(79,70,229,0.25)] dark:border-white/10 dark:bg-[#0b1330] dark:shadow-black/40"
      >
        <div className="relative overflow-hidden px-5 pb-5 pt-5 sm:px-8 sm:pb-6 sm:pt-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,#eef2ff_0%,#f5f7ff_45%,#ffffff_100%)] dark:bg-[radial-gradient(120%_140%_at_0%_0%,rgba(99,102,241,0.18)_0%,rgba(99,102,241,0.06)_45%,transparent_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-indigo-100/70 blur-2xl dark:bg-indigo-500/20"
          />
          <div className="relative flex items-start gap-4">
            <span
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-full text-white shadow-lg",
                TONE[tone]
              )}
            >
              {icon}
            </span>
            <div className="min-w-0 pt-0.5">
              <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-[#16294d] dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-[15px] leading-relaxed text-[#4f7396] dark:text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-7">
          {avatarName && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-[#f2fbf5] p-3 pr-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold uppercase text-white shadow-sm">
                {initialsOf(avatarName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[15px] font-bold text-[#16294d] dark:text-white">
                  {avatarName}
                </p>
                <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">
                  Changes apply immediately after saving.
                </p>
              </div>
              {avatarBadge && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-100/80 px-3 py-2 text-xs font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <ShieldCheck className="size-4" />
                  {avatarBadge}
                  <ChevronDown className="size-3.5 opacity-60" />
                </span>
              )}
            </div>
          )}

          {/* Section heading */}
          <div className="mt-6 flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 [&_svg]:size-4">
              {icon}
            </span>
            <h2 className="font-display text-lg font-bold tracking-tight text-[#16294d] dark:text-white">
              {sectionTitle ?? "Details"}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 py-5 sm:grid-cols-2">{children}</div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row sm:px-7 sm:py-5">
          <Link href={cancelHref ?? backHref} className="flex-1">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-slate-200 py-3 text-[15px] font-semibold text-[#3d5a73] hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            loading={submitting}
            icon={submitIcon}
            className={cn(
              "flex-1 rounded-xl py-3 text-[15px] font-bold text-white shadow-[0_12px_24px_-8px_rgba(79,70,229,0.6)]",
              TONE_GRADIENT[tone]
            )}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

const TONE: Record<string, string> = {
  indigo: "bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/40",
  blue: "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/40",
  emerald: "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/40",
  violet: "bg-gradient-to-br from-violet-500 to-violet-700 shadow-violet-500/40",
};

const TONE_GRADIENT: Record<string, string> = {
  indigo: "bg-gradient-to-r from-[#4338ca] to-[#6366f1] hover:from-[#3730a3] hover:to-[#4f46e5]",
  blue: "bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] hover:from-[#1e40af] hover:to-[#2563eb]",
  emerald: "bg-gradient-to-r from-[#059669] to-[#34d399] hover:from-[#047857] hover:to-[#10b981]",
  violet: "bg-gradient-to-r from-[#6d28d9] to-[#a78bfa] hover:from-[#5b21b6] hover:to-[#8b5cf6]",
};
