"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Menu, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Sidebar } from "./sidebar";
import { GENERAL_NAV, MAIN_NAV } from "./nav";

type Props = {
  user: { name: string; role: string };
  shopName: string;
  /** Hrefs of main-menu items this user's role may open. */
  allowedHrefs: string[];
  children: React.ReactNode;
};

export function AppShell({ user, shopName, allowedHrefs, children }: Props) {
  const [open, setOpen] = useState(false);
  const main = MAIN_NAV.filter((item) => allowedHrefs.includes(item.href));

  return (
    <div className="lg:flex">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Sidebar main={main} general={GENERAL_NAV} open={open} onClose={() => setOpen(false)} />
      <div className="min-w-0 flex-1 px-3 pb-10 pt-3 sm:px-4 lg:py-4 lg:pl-0 print:p-0">
        <header className="flex items-center gap-3 print:hidden rounded-card bg-surface/80 p-3 shadow-card backdrop-blur sm:p-4">
          <button type="button" onClick={() => setOpen(true)} className="btn-ghost h-11 w-11 p-0 lg:hidden" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          <label className="relative flex-1">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search bills, products & customers"
              className="h-12 w-full rounded-full bg-surface-2 pl-12 pr-4 text-[15px] placeholder:text-muted/80 focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </label>
          <Link href="/lock" className="btn-ghost hidden h-11 w-11 p-0 sm:inline-flex" aria-label="Switch user" title="Switch user (PIN)">
            <Lock className="h-5 w-5" />
          </Link>
          <Link href="/settings" className="flex items-center gap-3" title={`${user.name} · ${shopName}`}>
            <span className="hidden text-right leading-tight md:block">
              <span className="block text-sm font-semibold">{user.name}</span>
              <span className="block text-xs text-muted">{user.role}</span>
            </span>
            <Avatar name={user.name} />
          </Link>
        </header>
        <main id="main" tabIndex={-1} className="mt-4 focus:outline-none print:mt-0">{children}</main>
      </div>
    </div>
  );
}
