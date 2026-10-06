"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Smartphone, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import type { NavItem } from "./nav";

type Props = {
  main: NavItem[];
  general: NavItem[];
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ main, general, open, onClose }: Props) {
  const pathname = usePathname();

  const renderItem = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <li key={item.href} className="relative">
        {active && <span className="absolute -left-4 top-1/2 h-9 w-1.5 -translate-y-1/2 rounded-r-full bg-primary" />}
        <Link
          href={item.href}
          onClick={onClose}
          className={cn(
            "flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-[15px] transition",
            active ? "font-semibold text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Icon className={cn("h-5 w-5", active && "text-primary")} />
          {item.label}
        </Link>
      </li>
    );
  };

  return (
    <>
      <div
        className={cn("fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] transition lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col rounded-r-[2rem] bg-surface px-4 pb-4 pt-6 shadow-xl transition-transform",
          "lg:sticky lg:top-4 lg:z-0 lg:m-4 lg:h-[calc(100dvh-2rem)] lg:translate-x-0 lg:rounded-card lg:border lg:border-border/60 lg:shadow-card",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-2">
          <Logo />
          <button type="button" onClick={onClose} className="btn-ghost h-10 w-10 p-0 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 flex-1 overflow-y-auto pl-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted/80">Menu</p>
          <ul className="space-y-1">{main.map(renderItem)}</ul>
          <p className="mb-2 mt-8 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted/80">General</p>
          <ul className="space-y-1">
            {general.map(renderItem)}
            <li>
              <form action={logoutAction}>
                <button className="flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-[15px] text-muted transition hover:bg-surface-2 hover:text-fg">
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </form>
            </li>
          </ul>
        </nav>

        <div className="aura-pattern mt-4 rounded-3xl p-5 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary-strong">
            <Smartphone className="h-4 w-4" />
          </span>
          <p className="mt-3 font-semibold leading-snug">Install AuraPOS on your phone or tablet</p>
          <p className="mt-1 text-xs text-white/70">Use the browser menu → “Add to Home screen”.</p>
        </div>
      </aside>
    </>
  );
}
