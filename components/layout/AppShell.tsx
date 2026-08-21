"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import type { SessionUser } from "@/lib/auth";

export default function AppShell({
  user,
  shopName,
  location,
  gstin,
  lowStockCount,
  children,
}: {
  user: SessionUser;
  shopName: string;
  location: string;
  gstin: string;
  lowStockCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <Sidebar
        user={user}
        shopName={shopName}
        location={location}
        gstin={gstin}
        open={open}
        onClose={() => setOpen(false)}
      />
      <div className="lg:pl-[264px]">
        <Topbar user={user} onMenu={() => setOpen(true)} lowStockCount={lowStockCount} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
