"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell, LogOut, ChevronDown, Plus, Search } from "lucide-react";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

export default function Topbar({
  user,
  onMenu,
  lowStockCount,
}: {
  user: SessionUser;
  onMenu: () => void;
  lowStockCount: number;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials = user.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-violet-100 bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-ink-soft hover:bg-violet-50 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          className="h-10 w-full rounded-xl border border-violet-100 bg-surface-sunken pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-violet-300 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-violet-100"
          placeholder="Search products, invoices, customers..."
        />
      </div>

      <div className="flex-1 sm:hidden" />

      <Link href="/pos" className="btn-primary btn-sm">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New Sale</span>
      </Link>

      {/* Notifications */}
      <Link href="/products?filter=low" className="relative rounded-xl p-2.5 text-ink-soft hover:bg-violet-50" aria-label={`${lowStockCount} low stock alerts`}>
        <Bell className="h-5 w-5" />
        {lowStockCount > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {lowStockCount > 9 ? "9+" : lowStockCount}
          </span>
        )}
      </Link>

      {/* User menu */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 hover:bg-violet-50"
        >
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
            {initials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight text-ink">{user.name}</p>
            <p className="text-[11px] capitalize text-ink-muted">{user.role.toLowerCase()}</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-ink-muted sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 origin-top-right animate-scale-in rounded-xl border border-violet-100 bg-surface p-1.5 shadow-pop">
            <div className="border-b border-violet-100 px-3 py-2.5">
              <p className="text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            </div>
            <button onClick={logout} className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
