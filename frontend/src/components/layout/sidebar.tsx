"use client";

import { BookOpen, ClipboardList, LayoutDashboard, Receipt, User, UserCog, Users, Wallet, Wrench, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/logo";
import { API_SWAGGER_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  iconClass: string;
  href: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isStaffManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  const isCustomer = user?.role === "CUSTOMER";
  // ---- Colored nav icons ----
  // Each item carries its own icon color so the sidebar feels alive in both
  // themes. Colors stay visible on indigo / white / dark hovers because the
  // icon span turns solid tinted tile on hover.
  const sections: NavSection[] = isCustomer
    ? [
        {
          title: "Overview",
          items: [{ label: "Dashboard", icon: LayoutDashboard, iconClass: "text-indigo-500 dark:text-indigo-400", href: "/customer/dashboard" }],
        },
        {
          title: "My Services",
          items: [
            { label: "My Requests", icon: ClipboardList, iconClass: "text-sky-500 dark:text-sky-400", href: "/customer/requests" },
            { label: "Payments", icon: Wallet, iconClass: "text-amber-500 dark:text-amber-400", href: "/customer/payments" },
            { label: "Invoices", icon: Receipt, iconClass: "text-violet-500 dark:text-violet-400", href: "/customer/invoices" },
          ],
        },
        {
          title: "Account",
          items: [{ label: "My Profile", icon: User, iconClass: "text-emerald-500 dark:text-emerald-400", href: "/customer/profile" }],
        },
      ]
    : [
        {
          title: "Overview",
          items: [
            { label: "Dashboard", icon: LayoutDashboard, iconClass: "text-indigo-500 dark:text-indigo-400", href: "/dashboard" },
            { label: "My Profile", icon: User, iconClass: "text-slate-500 dark:text-slate-400", href: user?.role === "CUSTOMER" ? "/customer/profile" : `/users/${user?.userId}` },
          ],
        },
        {
          title: "Operations",
          items: (user?.role === "TECHNICIAN")
            ? [
                { label: "Customers", icon: Users, iconClass: "text-emerald-500 dark:text-emerald-400", href: "/customers" },
                { label: "Users", icon: UserCog, iconClass: "text-orange-500 dark:text-orange-400", href: "/users" },
                { label: "Jobs", icon: ClipboardList, iconClass: "text-sky-500 dark:text-sky-400", href: "/jobs" },
              ]
            : [
                { label: "Customers", icon: Users, iconClass: "text-emerald-500 dark:text-emerald-400", href: "/customers" },
                { label: "Jobs", icon: ClipboardList, iconClass: "text-sky-500 dark:text-sky-400", href: "/jobs" },
                { label: "Invoices", icon: Receipt, iconClass: "text-violet-500 dark:text-violet-400", href: "/invoices" },
                { label: "Payments", icon: Wallet, iconClass: "text-amber-500 dark:text-amber-400", href: "/payments" },
              ],
        },
        ...(isStaffManager
          ? [
              {
                title: "Team",
                items: [{ label: "Technicians", icon: Wrench, iconClass: "text-orange-500 dark:text-orange-400", href: "/technicians" }],
              } satisfies NavSection,
            ]
          : []),
        ...(isStaffManager
          ? [
              {
                title: "Management",
                items: [{ label: "Users", icon: UserCog, iconClass: "text-rose-500 dark:text-rose-400", href: "/users" }],
              } satisfies NavSection,
            ]
          : []),
      ];

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  const navLinkClass = (href: string) =>
    cn(
      "group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm font-medium transition",
      isActive(href)
        ? "border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
    );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg border border-transparent p-2 text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4 scrollbar-hide">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const ItemIcon = item.icon;
                  const itemActive = isActive(item.href);
                  const iconTile = cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100/80 ring-1 ring-transparent transition group-hover:scale-105 dark:bg-slate-800/80",
                    itemActive
                      ? "bg-white shadow-sm ring-indigo-100 dark:bg-white/10 dark:ring-white/20"
                      : "group-hover:bg-white group-hover:shadow-sm group-hover:ring-slate-200 dark:group-hover:bg-slate-800 dark:group-hover:ring-slate-700"
                  );
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onClose}
                      className={navLinkClass(item.href)}
                    >
                      <span className={iconTile}>
                        <ItemIcon className={cn("size-4 transition", item.iconClass)} />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {!isCustomer && (
            <a
              href={API_SWAGGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100/80 ring-1 ring-transparent transition group-hover:scale-105 group-hover:bg-white group-hover:shadow-sm group-hover:ring-slate-200 dark:bg-slate-800/80 dark:group-hover:bg-slate-800 dark:group-hover:ring-slate-700">
                <BookOpen className="size-4 text-teal-500 transition dark:text-teal-400" />
              </span>
              API Docs
            </a>
          )}
        </nav>

        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="px-3 text-xs text-slate-400 dark:text-slate-500">Opsly Platform · v1.0</p>
        </div>
      </aside>
    </>
  );
}


