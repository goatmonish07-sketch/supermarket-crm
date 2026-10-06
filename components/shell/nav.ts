import {
  BarChart3, Boxes, ClipboardList, LayoutGrid, LifeBuoy, Package, ReceiptText, Settings, Users, UsersRound,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type NavItem = { href: string; label: string; icon: typeof LayoutGrid; permission?: Permission };

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/billing", label: "Billing", icon: ReceiptText, permission: "billing.use" },
  { href: "/orders", label: "Orders & Jobs", icon: ClipboardList, permission: "orders.manage" },
  { href: "/products", label: "Products & Services", icon: Package, permission: "products.manage" },
  { href: "/inventory", label: "Inventory", icon: Boxes, permission: "inventory.manage" },
  { href: "/customers", label: "Customers", icon: UsersRound, permission: "customers.manage" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
  { href: "/team", label: "Team", icon: Users, permission: "team.manage" },
];

export const GENERAL_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: LifeBuoy },
];
