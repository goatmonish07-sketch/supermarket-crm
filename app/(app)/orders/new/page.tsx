import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { available } from "@/lib/catalogue";
import { PageHeader } from "@/components/ui/page-header";
import { OrderForm } from "../order-form";

export const metadata = { title: "New order" };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ kind?: string; customer?: string }> }) {
  const sp = await searchParams;
  const user = await requirePermission("orders.manage");
  const kind = sp.kind === "ORDER" ? "ORDER" : "JOB";

  const [variants, staff, customer] = await Promise.all([
    db.variant.findMany({
      where: { tenantId: user.tenantId, active: true, item: { active: true, type: { in: ["GOODS", "SERVICE", "NON_INVENTORY"] } } },
      include: { item: { select: { name: true, type: true, turnaroundDays: true } } },
      orderBy: [{ item: { name: "asc" } }, { sortOrder: "asc" }],
      take: 5000,
    }),
    db.user.findMany({ where: { tenantId: user.tenantId, active: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
    sp.customer ? db.customer.findFirst({ where: { id: sp.customer, tenantId: user.tenantId }, select: { id: true, name: true, phone: true } }) : null,
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title={kind === "JOB" ? "New job" : "New order"} back={{ href: `/orders?kind=${kind}`, label: "Orders & Jobs" }} />
      <OrderForm
        kind={kind}
        initialCustomer={customer}
        canCreateCustomer={can(user.role, "customers.manage")}
        staff={staff.map((s) => ({ id: s.id, name: s.name, role: ROLE_LABELS[s.role] }))}
        catalogue={variants.map((v) => ({
          id: v.id,
          name: v.item.name,
          label: [v.size, v.colour].filter(Boolean).join(" / "),
          price: v.price,
          type: v.item.type,
          available: available(v),
          turnaroundDays: v.item.turnaroundDays,
        }))}
      />
    </div>
  );
}
