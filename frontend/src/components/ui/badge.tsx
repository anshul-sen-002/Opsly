import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type {
  InvoiceStatus,
  JobStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
  UserStatus,
} from "@/types";

type BadgeColor = "indigo" | "blue" | "amber" | "emerald" | "rose" | "slate";

const COLOR_CLASSES: Record<BadgeColor, string> = {
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/30",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/30",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30",
};

export function Badge({
  color,
  children,
  className,
}: {
  color: BadgeColor;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        COLOR_CLASSES[color],
        className
      )}
    >
      {children}
    </span>
  );
}

const ROLE_COLORS: Record<Role, BadgeColor> = {
  ADMIN: "indigo",
  MANAGER: "blue",
  TECHNICIAN: "amber",
  CUSTOMER: "slate",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge color={ROLE_COLORS[role]}>{role}</Badge>;
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge color={status === "ACTIVE" ? "emerald" : "rose"}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"
        )}
      />
      {status}
    </Badge>
  );
}

export function DeletedBadge() {
  return (
    <Badge color="rose">
      <Trash2 className="size-3" />
      Deleted
    </Badge>
  );
}

const JOB_STATUS_COLORS: Record<JobStatus, BadgeColor> = {
  PENDING: "amber",
  ASSIGNED: "blue",
  IN_PROGRESS: "indigo",
  COMPLETED: "emerald",
  CLOSED: "slate",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge color={JOB_STATUS_COLORS[status]}>{status.replace(/_/g, " ")}</Badge>;
}

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, BadgeColor> = {
  DRAFT: "slate",
  ISSUED: "blue",
  PARTIALLY_PAID: "amber",
  PAID: "emerald",
  OVERDUE: "rose",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge color={INVOICE_STATUS_COLORS[status]}>{status.replace(/_/g, " ")}</Badge>;
}

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, BadgeColor> = {
  PENDING: "amber",
  SUCCESS: "emerald",
  FAILED: "rose",
  REFUNDED: "slate",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge color={PAYMENT_STATUS_COLORS[status]}>{status}</Badge>;
}

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, BadgeColor> = {
  CASH: "emerald",
  UPI: "indigo",
  CARD: "blue",
  BANK_TRANSFER: "slate",
};

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge color={PAYMENT_METHOD_COLORS[method]}>{method.replace(/_/g, " ")}</Badge>;
}