"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterTabsProps<T extends string> {
  value: T;
  options: { value: T; label: string; icon?: LucideIcon; count?: number }[];
  onChange: (value: T) => void;
}

/** Icon segment chips with counts — used for filters on list pages */
export function FilterTabs<T extends string>({ value, options, onChange }: FilterTabsProps<T>) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-[13px]",
              selected
                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm hover:border-indigo-700 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25"
                : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            )}
          >
            {Icon && <Icon className="size-4" />}
            {option.label}
            {option.count !== undefined && (
              <span className={selected ? "text-white/85" : "text-slate-400 dark:text-slate-500"}>
                ({option.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
