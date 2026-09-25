"use client";

import { useEffect, useState } from "react";
import { CustomerForm } from "@/app/(staff)/customers/customer-form";
import { ErrorState, FormSkeleton } from "@/components/ui/states";
import { ApiError, customerApi } from "@/lib/api";
import type { Customer } from "@/types";

export default function EditMyProfilePage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    customerApi.me().then((data) => {
      if (!cancelled) setCustomer(data);
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load your profile.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [attempt]);

  if (loading) return <FormSkeleton label="Loading profile form" />;
  if (error || !customer) return <ErrorState message={error ?? "Profile not found."} onRetry={() => setAttempt((value) => value + 1)} />;
  if (customer.deleted) return <ErrorState message="This customer profile is inactive. Contact support." />;

  return <CustomerForm selfService customerId={customer.id} submitLabel="Save changes" defaultValues={{
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? "",
    companyName: customer.companyName ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
  }} />;
}
