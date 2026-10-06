import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "billing.use",
  "billing.discount.override",
  "billing.refund",
  "products.manage",
  "inventory.manage",
  "customers.manage",
  "orders.manage",
  "jobs.update",
  "reports.view",
  "reports.profit",
  "team.manage",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Defaults per role. A per-tenant editable matrix comes in a later phase.
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  MANAGER: PERMISSIONS.filter((p) => p !== "settings.manage" && p !== "reports.profit"),
  CASHIER: ["billing.use", "customers.manage", "orders.manage"],
  STOCK: ["products.manage", "inventory.manage"],
  TAILOR: ["jobs.update"],
  ACCOUNTANT: ["reports.view", "reports.profit"],
};

export function can(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  STOCK: "Stock staff",
  TAILOR: "Tailor",
  ACCOUNTANT: "Accountant",
};

/** Roles an owner/manager may assign. Only owners can create managers or owners. */
export function assignableRoles(actor: Role): Role[] {
  const all = Object.keys(ROLE_LABELS) as Role[];
  if (actor === "OWNER") return all;
  return all.filter((r) => r !== "OWNER" && r !== "MANAGER");
}
