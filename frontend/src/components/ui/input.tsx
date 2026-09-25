"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, hint, icon, required, className, type = "text", ...rest }, ref) {
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
          <input
            ref={ref}
            id={id}
            type={type}
            className={cn(
              "block w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition placeholder:text-slate-400 dark:bg-slate-950/40 dark:text-slate-100",
              "focus:ring-2",
              "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-75 disabled:hover:border-slate-200 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-400 dark:disabled:hover:border-slate-700",
              icon && "pl-11",
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/25"
                : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700 dark:hover:border-slate-600",
              className
            )}
            {...rest}
          />
        </div>
        {hint && !error && <p className="mt-1.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">{hint}</p>}
        {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

interface PasswordInputProps extends Omit<InputProps, "type" | "icon"> {
  icon?: React.ReactNode;
}

/** Password field with a Show/Hide toggle inside the input */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, hint, icon, required, className, ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-[#16294d] dark:text-slate-200">
          {label} {required && <span className="font-bold text-rose-500">*</span>}
        </label>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            type={visible ? "text" : "password"}
            className={cn(
              "block w-full rounded-xl border bg-white px-4 py-3 pr-20 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition placeholder:text-slate-400 dark:bg-slate-950/40 dark:text-slate-100",
              "focus:ring-2",
              "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-75 disabled:hover:border-slate-200 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-400 dark:disabled:hover:border-slate-700",
              icon && "pl-11",
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/25"
                : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700 dark:hover:border-slate-600",
              className
            )}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center gap-1 px-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        {hint && !error && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

