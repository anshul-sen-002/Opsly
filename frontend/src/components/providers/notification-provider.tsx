"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { notificationApi } from "@/lib/api";
import { useAuth } from "./auth-provider";

/** How often the bell badge polls the backend for unread notifications */
const POLL_INTERVAL_MS = 15_000;

interface NotificationContextValue {
  unreadCount: number;
  /** Fetch the unread count immediately (used on focus and after read actions) */
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Polls GET /api/notifications/unread-count while the user is authenticated.
 * Polling stops on unauthenticated (login pages) — zero requests wasted.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    if (status !== "authenticated") return;
    notificationApi
      .unreadCount()
      .then((count) => setUnreadCount(count))
      .catch(() => {
        // Polling failure is silent — the next tick retries automatically
      });
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") {
      setUnreadCount(0);
      return;
    }
    refresh();
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);
    // Bell updates when the tab regains focus (e.g. admin returns after the
    // technician completed a job in another session) and when another tab
    // in the same browser changed notifications.
    const onFocus = () => refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "opsly.notifications.refresh") refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    // Same-tab signal: job/payment/customer actions bump localStorage so all
    // open provider instances (staff + customer tabs) refresh immediately.
    const onLocalRefresh = () => refresh();
    window.addEventListener("opsly:notifications-refresh", onLocalRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("opsly:notifications-refresh", onLocalRefresh);
    };
  }, [status, refresh]);

  const value = useMemo(() => ({ unreadCount, refresh }), [unreadCount, refresh]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}