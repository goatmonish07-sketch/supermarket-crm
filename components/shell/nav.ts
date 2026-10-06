import {
  BarChart3, Boxes, ClipboardList, LayoutGrid, LifeBuoy, Package, ReceiptText, Settings, Users, UsersRound,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

/** Shown when the user has any of `permissions` (or always, when omitted). */
export type NavItem = { href: string; label: string; icon: typeof LayoutGrid; permissions?: Permission[] };

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/billing", label: "Billing", icon: ReceiptText, permissions: ["billing.use"] },
  { href: "/orders", label: "Orders & Jobs", icon: ClipboardList, permissions: ["orders.manage", "jobs.update"] },
  { href: "/products", label: "Products & Services", icon: Package, permissions: ["products.manage"] },
  { href: "/inventory", label: "Inventory", icon: Boxes, permissions: ["inventory.manage"] },
  { href: "/customers", label: "Customers", icon: UsersRound, permissions: ["customers.manage"] },
  { href: "/reports", label: "Reports", icon: BarChart3, permissions: ["reports.view"] },
  { href: "/team", label: "Team", icon: Users, permissions: ["team.manage"] },
];

export const GENERAL_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: LifeBuoy },
];
