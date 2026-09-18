import Image from "next/image";
import { cn } from "@/lib/utils";

/** Header block used by login / register forms: centered brand mark + pill + heading. */
export function AuthFormHeader({
  pill,
  title,
  subtitle,
}: {
  pill: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-md shadow-indigo-600/10 ring-1 ring-slate-200 dark:ring-slate-600">
          <Image src="/op.webp" alt="Opsly logo" fill sizes="56px" className="object-contain p-1" priority />
        </span>
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Ops<span className="text-indigo-600 dark:text-indigo-400">ly</span>
        </span>
        <span
          className={cn(
            "rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100",
            "dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20"
          )}
        >
          {pill}
        </span>
      </div>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}


