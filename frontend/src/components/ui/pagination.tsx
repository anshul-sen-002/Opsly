import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number; // zero-based
  totalPages: number;
  totalElements: number;
  pageSize: number;
  label?: string;
  onPageChange: (page: number) => void;
}

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const end = Math.min(totalPages, start + 5);
  const pages: number[] = [];
  for (let i = start; i < end; i++) pages.push(i);
  return pages;
}

const NAV_BUTTON =
  "flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500 disabled:hover:shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200 dark:disabled:hover:border-slate-700 dark:disabled:hover:bg-slate-900 dark:disabled:hover:text-slate-400";

export function Pagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  label = "users",
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 0) return null;

  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalElements);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{from}</span> to{" "}
        <span className="font-semibold text-slate-900 dark:text-slate-100">{to}</span> of{" "}
        <span className="font-semibold text-slate-900 dark:text-slate-100">{totalElements}</span>{" "}
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="First page"
          className={NAV_BUTTON}
          disabled={page === 0}
          onClick={() => onPageChange(0)}
        >
          <ChevronsLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Previous page"
          className={NAV_BUTTON}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </button>
        {pageWindow(page, totalPages).map((p) => (
          <button
            key={p}
            type="button"
            aria-label={`Page ${p + 1}`}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg border text-sm font-medium transition",
              p === page
                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm hover:border-indigo-700 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25"
                : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            )}
          >
            {p + 1}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          className={NAV_BUTTON}
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Last page"
          className={NAV_BUTTON}
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(totalPages - 1)}
        >
          <ChevronsRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
