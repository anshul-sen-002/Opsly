import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Brand mark — the Opsly swirl logo from /public/op.webp.
 * The real favicon/logo file was supplied by the user.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700",
        className
      )}
    >
      <Image
        src="/op.webp"
        alt="Opsly logo"
        fill
        sizes="36px"
        className="object-contain p-1"
        priority
      />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex select-none items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        Ops<span className="text-indigo-600 dark:text-indigo-400">ly</span>
      </span>
    </span>
  );
}
