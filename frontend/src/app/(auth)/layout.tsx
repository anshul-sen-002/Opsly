import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarCheck2, CheckCircle2, ClipboardList, Wallet } from "lucide-react";
import type { ReactNode } from "react";

const HIGHLIGHTS = [
  "Dispatch jobs to technicians in seconds",
  "Track invoices and payments in one place",
  "AI assistant answers your operations questions",
];

/**
 * Split-screen auth shell: left = form panel (light/dark aware),
 * right = product preview (deep navy). Logo artwork is /public/op.webp.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col p-3 sm:p-5 lg:p-6">
      <div className="grid flex-1 gap-4 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative flex items-center justify-center rounded-3xl bg-white px-4 py-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:px-8 lg:px-10">
          <Link
            href="/"
            aria-label="Back to home"
            title="Back to home"
            className="absolute left-4 top-4 inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-700 hover:shadow-sm sm:left-6 sm:top-6 dark:text-slate-400 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="w-full max-w-md">{children}</div>
        </div>

        <div className="relative hidden flex-col justify-between overflow-hidden rounded-3xl bg-[#0b1226] p-6 text-white lg:flex xl:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-indigo-500/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-500/20 blur-3xl"
          />
          <div className="relative flex items-center justify-between">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 ring-1 ring-white/15">
              Smart Service Operations
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-300/20">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              Live ops
            </span>
          </div>
          <div className="relative mt-6">
            <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
              Run your service business on autopilot.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              Jobs, technicians, invoices and payments — handled in one calm
              dashboard instead of scattered chats and sheets.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <ClipboardList className="size-4 text-indigo-300" />
                  Jobs today
                </div>
                <p className="mt-2 text-2xl font-bold">24</p>
                <p className="mt-1 text-xs text-emerald-300">+6 assigned</p>
              </div>
              <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <CalendarCheck2 className="size-4 text-violet-300" />
                  Completed
                </div>
                <p className="mt-2 text-2xl font-bold">18</p>
                <p className="mt-1 text-xs text-slate-400">6 in progress</p>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <Wallet className="size-4 text-amber-300" />
                  Payments collected
                </div>
                <span className="text-xs text-slate-400">This week</span>
              </div>
              <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden>
                {[35, 55, 42, 70, 58, 82, 64, 92, 74, 88, 60, 78].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-sm bg-gradient-to-t from-indigo-500/60 to-indigo-300"
                  />
                ))}
              </div>
            </div>
            <ul className="mt-6 space-y-3">
              {HIGHLIGHTS.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-6 flex items-center justify-between text-xs text-slate-400">
            <span>© 2026 Opsly. All rights reserved.</span>
                        <span className="flex items-center gap-2">
              <Image
              src="/op.webp"
              alt="Opsly logo"
              width={24}
              height={24}
              className="rounded-2xl border-0 bg-transparent object-contain"
            />
              Trusted by service teams
            </span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
