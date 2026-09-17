"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, hint, placeholder, icon, required, className, children, ...rest }, ref) {
    const id = useId();
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-semibold text-[#16294d] dark:text-slate-200">
          {label} {required && <span className="font-bold text-rose-500">*</span>}
        </label>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              {icon}
            </span>
          )}
          <select
            ref={ref}
            id={id}
            className={cn(
              "block w-full appearance-none rounded-xl border bg-white py-3 pr-10 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition dark:bg-slate-950/40 dark:text-slate-100",
              "focus:ring-2",
              icon ? "pl-11" : "pl-4",
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/25"
                : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700 dark:hover:border-slate-600",
              className
            )}
            {...rest}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-4 text-slate-400" />
        </div>
        {hint && !error && <p className="mt-1.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">{hint}</p>}
        {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

