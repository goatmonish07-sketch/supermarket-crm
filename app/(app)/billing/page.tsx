import Link from "next/link";
import { History } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { available } from "@/lib/catalogue";
import { Counter } from "./counter";
import type { CartState, PosVariant } from "./types";

export const metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const sp = await searchParams;
  const user = await requirePermission("billing.use");
  const store = user.store;

  const [variants, held, staff] = await Promise.all([
    db.variant.findMany({
      where: { tenantId: user.tenantId, active: true, item: { active: true } },
      include: { item: { include: { category: { select: { name: true } } } } },
      orderBy: [{ item: { updatedAt: "desc" } }, { sortOrder: "asc" }],
      take: 5000,
    }),
    db.heldBill.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }),
    db.user.findMany({ where: { tenantId: user.tenantId, active: true }, select: { id: true, name: true, role: true, pinHash: true }, orderBy: { name: "asc" } }),
  ]);

  // Billing an order or job: start the cart from its lines at the agreed prices.
  const order = sp.order
    ? await db.order.findFirst({
        where: { id: sp.order, tenantId: user.tenantId, saleId: null, status: { notIn: ["CANCELLED", "DELIVERED"] } },
        include: { items: true, customer: { select: { id: true, name: true, phone: true } } },
      })
    : null;
  const priceOf = new Map(variants.map((v) => [v.id, v.price]));
  const fromOrder = order
    ? {
        id: order.id,
        number: order.number,
        advance: order.advancePaid,
        cart: {
          lines: order.items.map((i) => ({
            key: `o-${i.id}`,
            variantId: i.variantId,
            qty: i.qty,
            priceOverride: i.price === priceOf.get(i.variantId) ? null : i.price,
            discount: "",
            note: i.note ?? "",
          })),
          billDiscount: "",
          customer: order.customer,
          salespersonId: null,
        } satisfies CartState,
      }
    : null;

  const catalogue: PosVariant[] = variants.map((v) => ({
    id: v.id,
    itemId: v.itemId,
    name: v.item.name,
    category: v.item.category?.name ?? null,
    size: v.size,
    colour: v.colour,
    sku: v.sku,
    barcode: v.barcode,
    price: v.price,
    mrp: v.mrp,
    available: available(v),
    reorderLevel: v.reorderLevel,
    type: v.item.type,
    priceAtCounter: v.item.priceAtCounter,
    taxInclusive: v.item.taxInclusive,
    gstRateBp: v.item.gstRateBp,
    gstSlabAbove: v.item.gstSlabAbove,
    gstHighRateBp: v.item.gstHighRateBp,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <Link href="/billing/bills" className="btn-ghost h-11">
          <History className="h-4 w-4" aria-hidden="true" /> Bills
        </Link>
      </div>
      {sp.order && !order && (
        <p role="alert" className="rounded-2xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
          That order is already billed, delivered or cancelled.
        </p>
      )}
      <Counter
        key={order?.id ?? "counter"}
        fromOrder={fromOrder}
        catalogue={catalogue}
        held={held.map((h) => ({ id: h.id, label: h.label, createdAt: h.createdAt.toISOString(), by: h.user?.name ?? null, payload: h.payload as unknown as CartState }))}
        staff={staff.map((s) => ({ id: s.id, name: s.name }))}
        approvers={staff.filter((s) => s.pinHash && can(s.role, "billing.discount.override") && s.id !== user.id).map((s) => ({ id: s.id, name: s.name }))}
        settings={{
          shopName: store?.name ?? user.tenant.name,
          upiId: store?.upiId ?? null,
          roundOff: store?.roundOff ?? true,
          allowNegativeStock: store?.allowNegativeStock ?? false,
          cashierMaxDiscountBp: store?.cashierMaxDiscountBp ?? 1000,
          canOverride: can(user.role, "billing.discount.override"),
          canCreateCustomer: can(user.role, "customers.manage"),
        }}
      />
    </div>
  );
}
