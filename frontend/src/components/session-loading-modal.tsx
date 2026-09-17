
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";

interface SessionLoadingModalProps {
  open: boolean;
  message?: string;
}

export function SessionLoadingModal({
  open,
  message = "We're securely checking your account.",
}: SessionLoadingModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center overflow-hidden bg-slate-950/70 px-4 backdrop-blur-md"
      aria-busy="true"
      role="dialog"
      aria-modal="true"
      aria-label="Verifying session"
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Card */}
      <div className="relative w-full max-w-[390px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] dark:border-slate-700/70 dark:bg-slate-900">
        {/* Subtle top line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

        <div className="px-8 pb-8 pt-9">
          {/* Brand - Logo + Name */}
          <div className="flex justify-center">
            <div className="flex items-center gap-3">
              <Logo />
            </div>
          </div>

          {/* Animated loader */}
          <div className="mt-7 flex justify-center">
            <div className="relative flex size-12 items-center justify-center">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700" />
              
              {/* Spinning ring */}
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-600 border-r-indigo-400 dark:border-t-indigo-400 dark:border-r-indigo-500" />
              
              <Loader2 className="size-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          {/* Text */}
          <div className="mt-5 text-center">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">
              Verifying your session
            </h2>

            <p className="mx-auto mt-2 max-w-[280px] text-sm leading-5 text-slate-500 dark:text-slate-400">
              {message}
            </p>
          </div>

          {/* Loading indicator */}
          <div className="mx-auto mt-7 flex max-w-[230px] gap-1.5">
            <span className="h-1 flex-1 animate-pulse rounded-full bg-indigo-500" />
            <span className="h-1 flex-1 animate-pulse rounded-full bg-indigo-500" style={{ animationDelay: "150ms" }} />
            <span className="h-1 flex-1 animate-pulse rounded-full bg-indigo-500" style={{ animationDelay: "300ms" }} />
            <span className="h-1 flex-1 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" style={{ animationDelay: "450ms" }} />
          </div>
        </div>

        {/* Bottom subtle section */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-8 py-3 text-center dark:border-slate-800 dark:bg-slate-800/30">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Securing your access
          </span>
        </div>
      </div>
    </div>
  );
}

