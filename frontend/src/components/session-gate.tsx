"use client";

import { Clock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "./providers/auth-provider";
import { useToast } from "./providers/toast-provider";
import { Modal } from "./ui/modal";
import { loginPathForRole } from "./providers/auth-provider";

const COUNTDOWN_SECONDS = 30;

/**
 * Watches the auth session: when the access token is about to expire and a
 * silent refresh fails, this modal starts a 30 second countdown before
 * forcing a logout and redirecting to the matching login page.
 */
export function SessionGate() {
  const { sessionWarning, refreshSession, logout, user } = useAuth();
  const toast = useToast();
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    if (!sessionWarning) return;
    setSeconds(COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          clearInterval(interval);
          void logout().then(() => {
            toast.warning("Session expired", "Please sign in again to continue.");
            window.location.assign(loginPathForRole(user?.role));
          });
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionWarning]);

  const handleStaySignedIn = async () => {
    setExtending(true);
    const ok = await refreshSession();
    setExtending(false);
    if (ok) {
      toast.success("Session restored", "You can continue working safely.");
    } else {
      toast.error("Session expired", "Please sign in again to continue.");
      await logout();
      window.location.assign(loginPathForRole(user?.role));
    }
  };

  return (
    <Modal open={sessionWarning} className="max-w-sm text-center">
      <div className="flex flex-col items-center pt-2">
        <div className="flex size-16 items-center justify-center rounded-full bg-blue-50 ring-8 ring-blue-100/70 dark:bg-blue-500/10 dark:ring-blue-500/10">
          <ShieldCheck className="size-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
          Your session is about to expire
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          For your security, you will be automatically logged out in a few moments due to inactivity.
        </p>
        <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          <Clock className="size-4" />
          Redirecting you to the login page in {seconds} seconds...
        </div>
        <button
          type="button"
          onClick={handleStaySignedIn}
          disabled={extending}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {extending ? "Extending session..." : "Stay signed in"}
        </button>
      </div>
    </Modal>
  );
}
