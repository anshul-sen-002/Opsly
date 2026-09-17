"use client";

import { Eye, RefreshCw, Wrench } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ResponsiveTable, type Column } from "@/components/ui/responsive-table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ApiError, technicianApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Paged, Technician } from "@/types";

const PAGE_SIZE = 10;

function TechniciansPageContent() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Paged<Technician> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await technicianApi.list(targetPage, PAGE_SIZE, "name,asc"));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load technicians.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load]);

  const technicians = data?.content ?? [];

  const columns: Column<Technician>[] = [
    {
      header: "Technician",
      accessor: (technician) => (
        <Link href={`/technicians/${technician.id}`} className="flex items-center gap-3">
          <Avatar name={technician.name} size="md" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 dark:text-white">{technician.name}</p>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{technician.email}</p>
          </div>
        </Link>
      ),
    },
    { header: "Phone", accessor: (technician) => technician.phone ?? "-" },
    { header: "Specialization", accessor: (technician) => technician.specialization ?? "-" },
    { header: "Joined", accessor: (technician) => formatDate(technician.createdAt) },
  ];

  const renderActions = (technician: Technician) => (
    <Link href={`/technicians/${technician.id}`}>
      <Button variant="ghost" size="sm" icon={<Eye className="size-4" />}>
        View
      </Button>
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wrench}
        title="Technicians"
        subtitle="Field staff profiles and their assigned work"
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw className="size-4" />}
            onClick={() => void load(page)}
          >
            Refresh
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(page)} />
        ) : technicians.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No technicians yet"
            description="Create staff accounts with the Technician role from the Users page."
          />
        ) : (
          <>
            <ResponsiveTable columns={columns} rows={technicians} rowKey="id" actions={renderActions} />
            {data && (
              <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-6">
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  totalElements={data.totalElements}
                  pageSize={PAGE_SIZE}
                  label="technicians"
                  onPageChange={(next) => void load(next)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function TechniciansPage() {
  return <TechniciansPageContent />;
}
