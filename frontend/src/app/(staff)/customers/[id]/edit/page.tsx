"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { customerApi, ApiError } from "@/lib/api";
import type { Customer } from "@/types";
import { CustomerForm } from "../../customer-form";

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await customerApi.getById(params.id);
        if (!cancelled) setCustomer(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load customer.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) return <PageLoader />;
  if (error || !customer) return <ErrorState title="Could not load customer" message={error ?? undefined} />;
  if (customer.deleted) {
    return (
      <ErrorState
        title="Customer deleted"
        message={`${customer.name} has been deleted. Restore it from the customers list to edit.`}
      />
    );
  }

  return (
    <CustomerForm
      customerId={customer.id}
      defaultValues={{
        name: customer.name,
        phone: customer.phone,
        email: customer.email ?? "",
        companyName: customer.companyName ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
      }}
      submitLabel="Save changes"
    />
  );
}




