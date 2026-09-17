"use client";

import {
  CalendarClock,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Search,
  Sun,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { NotificationBell } from "@/components/layout/notification-bell";
import { RoleBadge } from "@/components/ui/badge";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import { avatarGradient } from "@/components/ui/avatar";
import { displayNameFromEmail } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // storage unavailable — theme applies for this session only
    }
  };

  return { theme, toggle };
}

const SEARCH_HINTS = [
  { label: "Dashboard", href: "/dashboard", icon: CalendarClock },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Jobs", href: "/tasks", icon: Wrench },
];

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  useEffect(() => {
    setMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMobileSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredHints = query
    ? SEARCH_HINTS.filter((hint) =>
        hint.label.toLowerCase().includes(query.toLowerCase()),
      )
    : SEARCH_HINTS;

  const searchBox = (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute inset-y-0 left-4 my-auto size-[18px] text-slate-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search jobs, customers, technicians..."
        className="h-11 w-full rounded-2xl border border-indigo-100 bg-indigo-50/50 pl-11 pr-20 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-indigo-200 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-indigo-500/50 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/10"
      />
      <kbd className="pointer-events-none absolute inset-y-0 right-3 my-auto hidden h-fit rounded-md border border-indigo-100 bg-white px-2 py-1 font-mono text-[11px] font-medium text-indigo-400 shadow-sm sm:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Ctrl K
      </kbd>
      {focused && filteredHints.length > 0 && (
        <div className="absolute inset-x-0 top-12 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
          <p className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800">
            Suggestions
          </p>
          {filteredHints.map((hint) => (
            <button
              key={hint.label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery("");
                setFocused(false);
                setMobileSearchOpen(false);
                router.push(hint.href);
              }}
              className="group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            >
              <hint.icon className="size-4 text-slate-400 transition group-hover:text-indigo-500 dark:group-hover:text-indigo-300" />
              {hint.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const handleEditProfile = () => {
    setMenuOpen(false);
    if (!user) return;
    if (user.role === "CUSTOMER") {
      router.push("/customer/profile/edit");
    } else {
      router.push(`/users/${user.userId}/edit`);
    }
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await logout();
    router.replace("/");
  };

  // Opens the signed-in user's own profile page (identity from the JWT)
  const handleMyProfile = () => {
    setMenuOpen(false);
    if (!user) return;
    // Customers live in their own portal — staff profiles stay at /users/{id}
    router.push(user.role === "CUSTOMER" ? "/customer/profile" : `/users/${user.userId}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="rounded-lg border border-transparent p-2 text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="relative hidden max-w-xl flex-1 sm:block">
        {searchBox}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationBell />

        <button
          type="button"
          aria-label="Toggle theme"
          onClick={toggle}
          className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {theme === "dark" ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </button>

        <span aria-hidden className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />

        <div
          className="relative"
          ref={menuRef}
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-2.5 rounded-2xl border border-transparent bg-indigo-50/60 py-1.5 pl-1.5 pr-2.5 transition hover:border-indigo-100 hover:bg-indigo-50 hover:shadow-sm sm:pr-3 dark:bg-slate-800/60 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            aria-label="Open account menu"
          >
            <span
              className={`flex size-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ring-1 ring-black/[0.04] dark:ring-white/10 ${avatarGradient(user?.email ?? "?")}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/user-image.svg"
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none size-5 select-none brightness-0 invert"
              />
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-[9rem] truncate text-sm font-semibold leading-tight text-slate-900 dark:text-white">
                {user ? displayNameFromEmail(user.email) : "..."}
              </span>
              <span className="block text-xs leading-tight text-slate-400 dark:text-slate-500">
                {user ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : ""}
              </span>
            </span>
            <ChevronDown className="hidden size-4 shrink-0 text-slate-400 sm:block" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              onMouseEnter={() => setMenuOpen(true)}
              className="absolute right-0 top-[calc(100%+8px)] w-60 animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/[0.03] dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/[0.04]">
              <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {user ? displayNameFromEmail(user.email) : "..."}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {user?.email}
                </p>
                <div className="mt-2">
                  {user && <RoleBadge role={user.role} />}
                </div>
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={handleMyProfile}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                >
                  <User className="size-4" />
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={handleEditProfile}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
                >
                  <Pencil className="size-4" />
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
