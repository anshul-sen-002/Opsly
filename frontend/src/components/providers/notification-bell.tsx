"use client";

import { Bell, CheckCheck, CircleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNotifications } from "./notification-provider";
import { notificationApi } from "@/lib/api";
import { useToast } from "./toast-provider";
import type { AppNotification } from "@/types";
import { timeAgo } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  JOB_CREATED: "New service request",
  JOB_ASSIGNED: "Job assigned",
  JOB_STARTED: "Job started",
  JOB_COMPLETED: "Job completed",
  JOB_CLOSED: "Job closed",
  INVOICE_ISSUED: "Invoice issued",
  PAYMENT_RECEIVED: "Payment received",
  CUSTOMER_REGISTERED: "New customer",
};

const TYPE_TONES: Record<string, string> = {
  JOB_CREATED: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  JOB_ASSIGNED: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  JOB_STARTED: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  JOB_COMPLETED: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  JOB_CLOSED: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  INVOICE_ISSUED: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  PAYMENT_RECEIVED: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
  CUSTOMER_REGISTERED: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
};

const DEFAULT_TONE = "bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400";

function NotificationIcon({ type }: { type: string }) {
  if (type === "PAYMENT_RECEIVED") return <span className="font-mono text-[11px] font-bold">₹</span>;
  if (type === "INVOICE_ISSUED") return <span className="font-mono text-[11px] font-bold">INV</span>;
  if (type === "CUSTOMER_REGISTERED") return <span className="font-mono text-[11px] font-bold">+</span>;
  if (type === "JOB_CLOSED") return <CheckCheck className="size-4" />;
  if (type === "JOB_COMPLETED") return <span className="font-mono text-[11px] font-bold">✓</span>;
  if (type === "JOB_CREATED") return <CircleAlert className="size-4" />;
  return <Bell className="size-4" />;
}

export function NotificationBell() {
  const { unreadCount, refresh } = useNotifications();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(false);
    notificationApi
      .list(0, 15)
      .then((page) => {
        setItems(page.content ?? []);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const markRead = useCallback(
    async (id: number) => {
      try {
        await notificationApi.markRead(id);
        setItems((current) =>
          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
        );
        refresh();
      } catch {
        toast.error("Could not mark notification as read", "Please try again.");
      }
    },
    [refresh, toast],
  );

  const markAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      refresh();
    } catch {
      toast.error("Could not mark all notifications as read", "Please try again.");
    }
  }, [refresh, toast]);

  const openNotification = (item: AppNotification) => {
    markRead(item.id);
    setOpen(false);
    if (item.link) router.push(item.link);
  };

    const unreadItems = items.filter((item) => !item.read);
  const displayCount = unreadCount > 0 ? unreadCount : unreadItems.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative hidden sm:inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-500 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {displayCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 grid size-[17px] place-items-center rounded-full bg-rose-600 text-[10px] font-bold text-white"
            aria-label={`${displayCount} unread notifications`}
          >
            {displayCount > 9 ? "9+" : displayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-80 max-w-[calc(100vw-2rem)] animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/10">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
              {unreadItems.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-center text-sm text-slate-400">Loading…</div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-rose-600">Failed to load.</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">No new notifications.</div>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(item)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${TYPE_TONES[item.type] ?? DEFAULT_TONE}`}
                    >
                      <NotificationIcon type={item.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold ${item.read ? "text-slate-500" : "text-slate-900 dark:text-white"}`}
                      >
                        {item.title}
                      </p>
                                            {item.message && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.message}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">{timeAgo(item.createdAt)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
