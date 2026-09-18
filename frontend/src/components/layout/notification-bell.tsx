"use client";

import {
  Bell,
  CalendarPlus,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  ReceiptIndianRupee,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useNotifications } from "@/components/providers/notification-provider";
import { EmptyState } from "@/components/ui/states";
import { notificationApi } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types";

const PAGE_SIZE = 15;

const TYPE_META: Record<NotificationType, { icon: typeof Wrench; tone: string }> = {
  JOB_CREATED: { icon: CalendarPlus, tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  JOB_ASSIGNED: { icon: Wrench, tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" },
  JOB_STARTED: { icon: ClipboardList, tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" },
  JOB_COMPLETED: { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  JOB_CLOSED: { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  INVOICE_ISSUED: { icon: FileText, tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  PAYMENT_RECEIVED: { icon: ReceiptIndianRupee, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  CUSTOMER_REGISTERED: { icon: CalendarPlus, tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
};

const CUSTOMER_JOB_LINK = "/customer/requests";
const CUSTOMER_INVOICE_LINK = "/customer/invoices";

/**
 * Backend links are staff-oriented (e.g. "/jobs/5", "/customer/invoices").
 * Customers have their own portal routes, so remap job/invoice links for them —
 * otherwise a customer tapping a notification lands on a staff page / 404.
 */
function resolveNotificationLink(link: string | null, role?: string): string | null {
  if (!link) return null;
  if (role !== "CUSTOMER") return link;
  if (link.startsWith("/jobs")) return CUSTOMER_JOB_LINK;
  if (link.startsWith("/invoices")) return CUSTOMER_INVOICE_LINK;
  if (link.startsWith("/payments")) return "/customer/payments";
  if (link.startsWith("/customers")) return "/customer/profile";
  return link;
}

/** Bell button + dropdown panel — live unread badge, unread-only feed, mark-read, deep links */
export function NotificationBell() {
  const { unreadCount, refresh } = useNotifications();
  const { user } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadItems = useCallback(() => {
    setLoading(true);
    // The backend feed returns UNREAD rows only — rows the user has already
    // read never reappear in the dropdown.
    notificationApi
      .list(0, PAGE_SIZE)
      .then((page) => setItems(page.content))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClickAway = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadItems(); // fresh list on every open
    };

  const handleItemClick = async (item: AppNotification) => {
    // Optimistically mark as read in the list view so the panel reflects state
    // immediately — the API call is made next, and refresh() reconciles.
    setItems((current) =>
      current.map((i) => (i.id === item.id ? { ...i, read: true } : i))
    );
    try {
      if (!item.read) await notificationApi.markRead(item.id);
    } catch {
      // mark-read is best-effort — navigation should not be blocked.
      // revert optimistically-set state on failure
      setItems((current) =>
        current.map((i) => (i.id === item.id ? { ...i, read: false } : i))
      );
    }
    refresh();
    // Close dropdown after API call completes and state is updated
    setOpen(false);
    const target = resolveNotificationLink(item.link, user?.role);
    if (target) router.push(target);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      // The feed is unread-only, so after marking everything read the panel
      // is empty — reflect that immediately instead of showing greyed rows.
      setItems([]);
    } catch {
      // silent — badge refresh happens below regardless
    }
    refresh();
  };

  const unreadInView = items.filter((item) => !item.read).length;

  return (
    <div ref={containerRef} className="static sm:relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="notifications-panel"
        className={cn(
          "relative flex size-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
          open && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        )}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notifications-panel"
          role="dialog"
          aria-label="Notifications panel"
          className="absolute inset-x-3 top-[calc(100%+8px)] z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/[0.03] sm:left-auto sm:right-0 sm:w-[min(360px,calc(100vw-2rem))] dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/[0.04]"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
              {unreadInView > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                  {unreadInView} new
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {unreadInView > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="space-y-3 px-4 py-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex animate-pulse items-center gap-3">
                    <div className="size-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                description="New activity on jobs, invoices and payments will show up here."
              />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => {
                  const meta = TYPE_META[item.type] ?? {
                    icon: Bell,
                    tone: "bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400",
                  };
                  const Icon = meta.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void handleItemClick(item)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.07]",
                          !item.read && "bg-indigo-50/40 dark:bg-indigo-500/[0.05]"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                            meta.tone
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-sm text-slate-700 dark:text-slate-200",
                                !item.read && "font-semibold text-slate-900 dark:text-white"
                              )}
                            >
                              {item.title}
                            </span>
                            {!item.read && <span className="size-2 shrink-0 rounded-full bg-indigo-500" />}
                          </span>
                          {item.message && (
                            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                              {item.message}
                            </span>
                          )}
                          <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
                            {timeAgo(item.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}