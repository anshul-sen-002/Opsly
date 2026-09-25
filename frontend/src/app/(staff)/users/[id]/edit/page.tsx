"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminOnly } from "@/components/admin-only";
import { ErrorState, FormSkeleton } from "@/components/ui/states";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiError, staffApi, userProfileApi } from "@/lib/api";
import { displayNameFromEmail } from "@/lib/utils";
import type { Staff, StaffRole } from "@/types";
import { UserForm } from "../../user-form";

function EditUserPageContent() {
  const params = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const selfService = currentUser?.role === "TECHNICIAN";
  // ADMIN: any staff account. MANAGER: may open the form, but the guard below
  // (mirroring AdminService.updateStaff) restricts them to TECHNICIAN targets.
  const allowed =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "MANAGER" ||
    (selfService && String(currentUser?.userId) === params.id);
  const [user, setUser] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const staff = selfService ? await userProfileApi.me() : await staffApi.getById(params.id);
        if (!cancelled) setUser(staff);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load user.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id, allowed, selfService]);

  if (!allowed) return <ErrorState title="Access denied" message="You can only edit your own profile." />;
  if (loading) return <FormSkeleton label="Loading account form" />;
  if (error || !user) return <ErrorState title="Could not load user" message={error ?? undefined} />;
  if (user.role === "CUSTOMER") {
    return <ErrorState title="Not a staff account" message="Customer accounts are managed from the customers page." />;
  }
  if (user.deleted) {
    return <ErrorState title="User deleted" message="Restore this account from the users list before editing it." />;
  }
  // Mirror the backend rule: a MANAGER may only edit TECHNICIAN accounts
  // (and never their own) — AdminService.updateStaff rejects everything else.
  if (
    currentUser?.role === "MANAGER" &&
    (user.role !== "TECHNICIAN" || String(user.id) === String(currentUser.userId))
  ) {
    return (
      <ErrorState
        title="Access denied"
        message="Managers can only edit Technician accounts."
      />
    );
  }

  return (
    <UserForm
      userId={user.id}
      selfService={selfService}
      defaultValues={{
        name: user.name ?? displayNameFromEmail(user.email),
        email: user.email,
        role: user.role as StaffRole,
        phone: user.phone ?? "",
        specialization: user.specialization ?? "",
      }}
      submitLabel="Save changes"
    />
  );
}

export default function EditUserPage() {
  return (
    <AdminOnly roles={["ADMIN", "MANAGER", "TECHNICIAN"]}>
      <EditUserPageContent />
    </AdminOnly>
  );
}