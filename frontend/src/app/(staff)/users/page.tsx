"use client";

import { AdminOnly } from "@/components/admin-only";
import { UsersList } from "./users-list";

export default function UsersPage() {
  return (
    <AdminOnly roles={["ADMIN", "MANAGER", "TECHNICIAN"]}>
      <UsersList />
    </AdminOnly>
  );
}
