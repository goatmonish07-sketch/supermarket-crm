"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Store, Crown, X } from "lucide-react";
import clsx from "clsx";
import { NAV_ITEMS } from "@/lib/nav";
import type { SessionUser } from "@/lib/auth";

export default function Sidebar({
  user,
  shopName,
  location,
  gstin,
  open,
  onClose,
}: {
  user: SessionUser;
  shopName: string;
  location: string;
  gstin: string;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || user.role === "ADMIN");

  return (
    <>
      {/* Mobile scrim */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-sidebar-gradient text-white transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient shadow-sidebar">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-extrabold leading-none">SuperMart</p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-violet-300">CRM</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-violet-200 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-brand-gradient text-white shadow-sidebar"
                      : "text-violet-100/70 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className={clsx("h-[18px] w-[18px]", active ? "text-white" : "text-violet-300 group-hover:text-white")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Upgrade card */}
        <div className="px-4 pb-3">
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-violet-200">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-semibold text-white">Go Premium</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-violet-100/60">
              Unlock multi-store, e-invoicing & advanced analytics.
            </p>
            <button className="btn-primary btn-sm mt-3 w-full">Upgrade Now</button>
          </div>
        </div>

        {/* Shop footer */}
        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10">
            <Store className="h-4 w-4 text-violet-200" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{shopName}</p>
            <p className="truncate text-[11px] text-violet-100/60">{location}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
