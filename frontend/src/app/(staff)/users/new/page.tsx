"use client";

import { AdminOnly } from "@/components/admin-only";
import { UserForm } from "../user-form";

export default function AddUserPage() {
  return (
    <AdminOnly>
      <UserForm submitLabel="Create account" />
    </AdminOnly>
  );
}
