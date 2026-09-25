"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

type ToastFn = (title: string, description?: string) => void;

interface ToastContextValue {
  success: ToastFn;
  info: ToastFn;
  warning: ToastFn;
  error: ToastFn;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { bar: string; chip: string; icon: JSX.Element }> = {
  success: {
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    icon: <CheckCircle2 className="size-4 sm:size-[18px]" strokeWidth={2} />,
  },
  info: {
    bar: "bg-sky-500",
    chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    icon: <Info className="size-4 sm:size-[18px]" strokeWidth={2} />,
  },
  warning: {
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    icon: <AlertCircle className="size-4 sm:size-[18px]" strokeWidth={2} />,
  },
  error: {
    bar: "bg-rose-500",
    chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    icon: <XCircle className="size-4 sm:size-[18px]" strokeWidth={2} />,
  },
};

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant) =>
      (title: string, description?: string) => {
        const id = ++counterRef.current;
        setToasts((current) => [...current.slice(-4), { id, variant, title, description }]);
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: push("success"),
      info: push("info"),
      warning: push("warning"),
      error: push("error"),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[10000] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[380px] sm:gap-2.5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto relative flex animate-toast-in items-start gap-2.5 overflow-hidden rounded-xl border border-slate-200/80 bg-white py-2.5 pl-5 pr-8 shadow-lg shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/50 sm:gap-3 sm:py-3 sm:pl-6 sm:pr-10"
          >
            <span
              aria-hidden
              className={cn("absolute inset-y-0 left-0 w-1", VARIANT_STYLES[toast.variant].bar)}
            />
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8",
                VARIANT_STYLES[toast.variant].chip
              )}
            >
              {VARIANT_STYLES[toast.variant].icon}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-semibold leading-5 text-slate-900 dark:text-white sm:text-sm">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-[13px]">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className="absolute right-2 top-2 rounded-md p-0.5 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 sm:right-3 sm:top-3"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
