"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/ui/states";
import type { Role } from "@/types";

/**
 * Client-side guard for pages backed by role-restricted endpoints.
 * Defaults to ADMIN-only so existing call sites keep their behaviour.
 */
export function AdminOnly({
  children,
  roles = ["ADMIN"],
  title = "Admin access required",
  description = "This section is only available to administrator accounts.",
}: {
  children: React.ReactNode;
  /** Roles allowed to view the page — defaults to ADMIN only */
  roles?: Role[];
  title?: string;
  description?: string;
}) {
  const { user, status } = useAuth();

  if (status === "loading") return null;

  if (!user || !roles.includes(user.role)) {
    return <EmptyState icon={ShieldAlert} title={title} description={description} />;
  }

  return <>{children}</>;
}
