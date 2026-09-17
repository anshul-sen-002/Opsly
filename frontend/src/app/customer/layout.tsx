"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { AskOpslyAI } from "@/components/ask-opsly-ai";
import { SessionGate } from "@/components/session-gate";
import { SessionLoadingModal } from "@/components/session-loading-modal";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

/**
 * Customer portal shell — mirrors the staff layout (same Sidebar/Topbar look)
 * and exposes the same AI assistant (customers get a customer-scoped set of
 * AI tools on the backend). Unauthenticated visitors go to customer login;
 * staff accounts are bounced to the staff area.
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/customer/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && user && user.role !== "CUSTOMER") {
      router.replace("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <SessionLoadingModal
        open={true}
        message={status === "unauthenticated" ? "Redirecting..." : "Loading..."}
      />
    );
  }

  if (!user || user.role !== "CUSTOMER") {
    return <SessionLoadingModal open={true} message="Redirecting..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b18] dark:text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main key={pathname} className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <SessionGate />
      <AskOpslyAI />
    </div>
  );
}
