import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Package,
  Users,
  NotebookPen,
  BarChart3,
  Truck,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS / Billing", href: "/pos", icon: ShoppingCart },
  { label: "Invoices", href: "/invoices", icon: ReceiptText },
  { label: "Inventory", href: "/products", icon: Package },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Khata / Dues", href: "/dues", icon: NotebookPen },
  { label: "Suppliers", href: "/suppliers", icon: Truck },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Staff", href: "/staff", icon: UserCog, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];
