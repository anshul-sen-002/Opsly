"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Headphones,
  LayoutDashboard,
  Mic,
  Server,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionLoadingModal } from "@/components/session-loading-modal";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

// ─── Feature data ────────────────────────────────────────────────
const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Dashboard & Analytics",
    description:
      "Real-time overview of jobs, revenue, technician performance, and customer activity — all on one screen.",
  },
  {
    icon: CalendarCheck,
    title: "Job Lifecycle",
    description:
      "Track every job from PENDING to ASSIGNED to IN_PROGRESS to COMPLETED to CLOSED with role-based transitions.",
  },
  {
    icon: Server,
    title: "Customer Directory",
    description:
      "Manage service clients with contact details, company info, and login accounts for self-service.",
  },
  {
    icon: Wrench,
    title: "Technician Management",
    description:
      "Assign specialized techs, monitor workloads, and let them update jobs from the field.",
  },
  {
    icon: CreditCard,
    title: "Invoicing & Payments",
    description:
      "Auto-create invoices from closed jobs, record payments, and track what is paid or overdue.",
  },
  {
    icon: Headphones,
    title: "Ask Opsly AI",
    description:
      "Chat or speak with the built-in AI assistant to query live data — jobs, customers, amounts — instantly.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Add your team and customers",
    description:
      "Create staff accounts with role-based access and onboard customers with contact details.",
  },
  {
    num: "02",
    title: "Create and assign jobs",
    description:
      "Log service requests, assign technicians, and track every status change through completion.",
  },
  {
    num: "03",
    title: "Invoice and collect payments",
    description:
      "Close jobs to generate invoices automatically, then record payments and let AI handle the math.",
  },
  {
    num: "04",
    title: "Monitor with AI",
    description:
      "Ask Opsly AI anything: pending jobs, monthly revenue, or overdue invoices — get answers in seconds.",
  },
];

export default function HomePage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(user?.role === "CUSTOMER" ? "/customer/dashboard" : "/dashboard");
    }
  }, [status, user, router]);

  // Show loading modal only while status is "loading"
  if (status === "loading") {
    return <SessionLoadingModal open={true} message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b18] dark:text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/70 backdrop-blur-lg dark:border-slate-800/60 dark:bg-[#070b18]/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-6 lg:px-8">
          <Logo className="h-8 sm:h-9" />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="size-9 sm:size-10" />
            <Link
              href="/staff/login"
              className="hidden h-9 items-center rounded-xl border border-transparent px-4 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-700 hover:shadow-sm sm:inline-flex dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            >
              Staff sign in
            </Link>
            <Link
              href="/customer/login"
              className="hidden h-9 items-center rounded-xl border border-transparent px-4 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-700 hover:shadow-sm sm:inline-flex dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            >
              Sign in
            </Link>
            <Link
              href="/customer/register"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25 sm:px-5"
            >
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>
      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-4 pb-8 pt-12 sm:px-6 sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 size-[500px] -translate-x-1/4 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/15"
        />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20">
              <Sparkles className="size-3.5" />
              Smart Service Operations Platform
            </span>
            <h1 className="mt-5 max-w-2xl text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.08] tracking-tight">
              Service ops that{" "}
              <span className="bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                run themselves
              </span>
              .
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-500 dark:text-slate-400">
              Opsly brings customers, technicians, jobs, invoices and payments
              into one calm dashboard — plus an AI assistant you can talk to.
              Stop juggling spreadsheets and start scaling.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/customer/register"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25"
              >
                Start as a customer
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/staff/login"
                className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
              >
                Staff sign in
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-3.5 text-emerald-500" />
                Role-based access
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-3.5 text-emerald-500" />
                Real-time data
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-3.5 text-emerald-500" />
                AI powered
              </span>
            </div>
          </div>
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#0b1226] p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 lg:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-indigo-500/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-16 size-64 rounded-full bg-violet-500/15 blur-3xl"
            />
            <div className="relative flex items-center justify-between">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 ring-1 ring-white/15">
                Live preview
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-300/20">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                All systems go
              </span>
            </div>
            <div className="relative mt-6 grid grid-cols-3 gap-3">
              {[
                { label: "Active Jobs", value: "24", color: "text-indigo-300" },
                { label: "Revenue", value: "₹1.8L", color: "text-emerald-300" },
                { label: "Technicians", value: "8", color: "text-amber-300" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur"
                >
                  <p className="text-xs text-slate-400">{m.label}</p>
                  <p className={`mt-1 text-xl font-bold ${m.color}`}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="relative mt-4 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur sm:p-5">
              <div className="flex items-center gap-3">
                <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                  <Image
                    src="/op.webp"
                    alt="Opsly"
                    fill
                    sizes="40px"
                    className="object-contain p-1"
                  />
                </span>
                <div>
                  <p className="text-sm font-semibold">Ask Opsly AI</p>
                  <p className="text-xs text-slate-400">
                    Type or speak your question
                  </p>
                </div>
                <span className="ml-auto flex size-9 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-200">
                  <Mic className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                &ldquo;How many jobs are pending this week?&rdquo; — Opsly AI
                checks live data and responds instantly.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* ── Features ── */}
      <section className="border-t border-slate-200/60 bg-white py-20 dark:border-slate-800/60 dark:bg-[#090e1f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <Badge color="indigo">Everything you need</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              One platform for your entire operation
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-slate-500 dark:text-slate-400">
              From first customer call to final payment — Opsly connects every
              step with zero spreadsheet work.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md dark:border-slate-800 dark:bg-[#0b1330] dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/[0.06]"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-transparent transition group-hover:bg-indigo-100 group-hover:ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:group-hover:bg-indigo-500/20 dark:group-hover:ring-indigo-500/30">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* ── How it works ── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <Badge color="blue">Simple workflow</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              How Opsly works
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-slate-500 dark:text-slate-400">
              Four steps from setup to AI-powered operations.
            </p>
          </div>
          <div className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, idx) => (
              <div key={step.num} className="group relative rounded-2xl transition">
                {idx < STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className="absolute -right-4 top-6 hidden text-slate-300 lg:block dark:text-slate-700"
                  >
                    <ChevronRight className="size-5" />
                  </div>
                )}
                <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-lg font-bold text-indigo-600 ring-1 ring-transparent transition group-hover:bg-indigo-100 group-hover:ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:group-hover:bg-indigo-500/20 dark:group-hover:ring-indigo-500/30">
                  {step.num}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-slate-900 transition group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── AI Highlight ── */}
      <section className="border-t border-slate-200/60 bg-gradient-to-b from-white to-slate-50 py-20 dark:border-slate-800/60 dark:from-[#090e1f] dark:to-[#070b18]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-[#0b1226] p-8 text-white ring-1 ring-white/10 sm:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-indigo-500/20 blur-3xl"
            />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <Badge color="indigo">
                  <Sparkles className="size-3" />
                  AI Assistant
                </Badge>
                <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  Talk to your operations
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Opsly AI works like a team member who knows everything. Ask
                  about pending jobs, customer history, monthly revenue, or
                  technician workload — get exact answers from live data.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Voice and text input — works in Indian languages too",
                    "Runs read-only queries against real database",
                    "No training needed — just start asking",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-slate-300"
                    >
                      <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/customer/register"
                  className="mt-8 inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/30"
                >
                  Try it free
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur-sm sm:p-6">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                  <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5">
                    <Image
                      src="/op.webp"
                      alt="Opsly"
                      fill
                      sizes="32px"
                      className="object-contain p-0.5"
                    />
                  </span>
                  <span className="text-sm font-semibold">Ask Opsly</span>
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                    <span className="size-1.5 rounded-full bg-emerald-300" />
                    Online
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-indigo-500/20 px-3.5 py-2.5 text-sm text-slate-100">
                    Show me pending jobs for Acme Corp
                  </div>
                  <div className="rounded-xl bg-white/10 px-3.5 py-2.5 text-sm text-slate-200">
                    Acme Corp has 3 pending jobs: HVAC maintenance (created 2
                    days ago), Electrical rewiring (5 days), and Plumbing
                    inspection (1 day). Would you like to assign a technician to
                    any of them?
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="size-2 rounded-full bg-indigo-400/40" />
                    Powered by LLM + live data
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ── CTA ── */}
      <section className="border-t border-slate-200/60 bg-white py-20 dark:border-slate-800/60 dark:bg-[#090e1f]">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <Badge color="emerald">Get started free</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to simplify your service operations?
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-slate-500 dark:text-slate-400">
            Join small service businesses that use Opsly to manage customers,
            jobs, and payments — with AI assisting every step.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/customer/register"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25"
            >
              Create your account
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/staff/login"
              className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            >
              Staff sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200/60 bg-white py-8 dark:border-slate-800/60 dark:bg-[#070b18]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-400 sm:flex-row sm:px-6 dark:text-slate-500">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5 ring-1 ring-slate-200 dark:ring-slate-700">
              <Image
                src="/op.webp"
                alt=""
                width={24}
                height={24}
                className="object-contain p-0.5"
              />
            </span>
            <span>Opsly. All rights reserved.</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/customer/login"
              className="rounded-md px-1 transition hover:text-slate-700 hover:underline hover:underline-offset-4 dark:hover:text-slate-300"
            >
              Customer sign in
            </Link>
            <Link
              href="/staff/login"
              className="rounded-md px-1 transition hover:text-slate-700 hover:underline hover:underline-offset-4 dark:hover:text-slate-300"
            >
              Staff sign in
            </Link>
            <Link
              href="/customer/register"
              className="rounded-md px-1 transition hover:text-slate-700 hover:underline hover:underline-offset-4 dark:hover:text-slate-300"
            >
              Register
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
