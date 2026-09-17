/** Join class names, skipping falsy values */
export function cn(...classes: unknown[]): string {
  return classes.filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}

/**
 * The User entity stores no display name, so derive one from the email.
 * "anshulverma0103@gmail.com" → "Anshulverma"
 */
export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/\d+$/, "").replace(/[._-]+/g, " ").trim();
  const source = cleaned || local;
  return source
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Two-letter initials from a name or email */
export function initialsOf(nameOrEmail: string): string {
  const name = nameOrEmail.includes("@") ? displayNameFromEmail(nameOrEmail) : nameOrEmail;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-teal-500",
] as const;

/** Deterministic avatar background for a given seed string */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** 09/09/2026 style date */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** 09/09/2026, 10:24 AM style date-time */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 12:42 style clock time */
export function formatClockTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** 12 Sep 2025 style long date */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** 09:24 PM style clock time for an ISO timestamp */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** INR currency, e.g. 24180 → "₹24,180" */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/** Compact number, e.g. 1280 → "1.3K" */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/**
 * Nudge every open bell (this tab + other tabs) to re-poll immediately.
 * Call this after any mutation that fires a backend notification
 * (job create/assign/start/complete/close, payment, registration, invoice)
 * so OTHER roles see it without waiting for the next poll tick.
 */
export function signalNotificationsChanged(): void {
  try {
    localStorage.setItem("opsly.notifications.refresh", String(Date.now()));
  } catch {
    // storage unavailable — polling still picks it up
  }
  try {
    window.dispatchEvent(new Event("opsly:notifications-refresh"));
  } catch {
    // non-DOM environment — ignore
  }
}

/** Relative time for notifications — "just now", "5m ago", "2h ago", "3d ago", then a date */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatLongDate(iso);
}
