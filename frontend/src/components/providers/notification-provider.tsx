"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { notificationApi } from "@/lib/api";
import { useAuth } from "./auth-provider";

/** How often the bell badge polls the backend for unread notifications */
const POLL_INTERVAL_MS = 45_000;

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
  const timerRef = useRef<number | null>(null);

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
    timerRef.current = window.setInterval(refresh, POLL_INTERVAL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      window.removeEventListener("focus", onFocus);
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