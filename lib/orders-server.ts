import "server-only";
import { z } from "zod";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { can } from "./permissions";
import { available, tracksStock } from "./catalogue";
import { CheckoutError } from "./checkout";
import { isOpen, manualStages } from "./orders";

type Tx = Prisma.TransactionClient;
const METHODS = ["CASH", "CARD", "UPI", "BANK", "OTHER"] as const;
const dateStr = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional();

export const createOrderSchema = z.object({
  kind: z.enum(["ORDER", "JOB"]),
  customerId: z.string().min(1, "Choose a customer"),
  items: z
    .array(z.object({ variantId: z.string().min(1), qty: z.number().int().min(1).max(999), price: z.number().int().min(0).max(100_000_000), note: z.string().trim().max(200).optional() }))
    .min(1, "Add at least one item or service")
    .max(50),
  dueDate: dateStr,
  trialDate: dateStr,
  assigneeId: z.string().optional(),
  deliveryMode: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"),
  deliveryAddress: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  designNotes: z.string().trim().max(1000).optional(),
  measurementId: z.string().optional(),
  newMeasurement: z
    .object({ label: z.string().trim().min(1).max(40), values: z.record(z.string().max(40), z.number().min(0).max(200)), notes: z.string().trim().max(300).optional() })
    .optional(),
  advance: z.object({ method: z.enum(METHODS), amount: z.number().int().min(0).max(100_000_000), reference: z.string().trim().max(60).optional() }).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const toDate = (d?: string) => (d ? new Date(`${d}T12:00:00+05:30`) : null);

async function nextNumber(tx: Tx, tenantId: string, kind: "ORDER" | "JOB") {
  const [{ last }] = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO "DocCounter" ("tenantId", "kind", "last") VALUES (${tenantId}, ${kind}, 1)
    ON CONFLICT ("tenantId", "kind") DO UPDATE SET "last" = "DocCounter"."last" + 1
    RETURNING "last"`;
  return `${kind === "JOB" ? "JOB" : "ORD"}-${String(last).padStart(4, "0")}`;
}

/** Hold stock for open order lines that aren't fully reserved yet. Returns true when every line is covered. */
async function reserveLines(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, include: { variant: { include: { item: { select: { type: true } } } } } });
  const ids = [...new Set(items.filter((i) => tracksStock(i.variant.item.type)).map((i) => i.variantId))].sort();
  if (ids.length) await tx.$queryRaw`SELECT id FROM "Variant" WHERE id = ANY(${ids}::text[]) ORDER BY id FOR UPDATE`;
  let complete = true;
  for (const i of items) {
    if (!tracksStock(i.variant.item.type)) continue;
    const missing = i.qty - i.reservedQty;
    if (missing <= 0) continue;
    const v = await tx.variant.findUniqueOrThrow({ where: { id: i.variantId } });
    const take = Math.max(0, Math.min(missing, available(v)));
    if (take > 0) {
      await tx.variant.update({ where: { id: v.id }, data: { reserved: { increment: take } } });
      await tx.orderItem.update({ where: { id: i.id }, data: { reservedQty: { increment: take } } });
    }
    if (take < missing) complete = false;
  }
  return complete;
}

export async function releaseReservations(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId, reservedQty: { gt: 0 } } });
  for (const i of items) {
    await tx.variant.update({ where: { id: i.variantId }, data: { reserved: { decrement: i.reservedQty } } });
    await tx.orderItem.update({ where: { id: i.id }, data: { reservedQty: 0 } });
  }
}

export async function createOrder(user: CurrentUser, input: CreateOrderInput) {
  const store = user.store;
  if (!store) throw new CheckoutError("Your account isn't linked to a store.");
  const customer = await db.customer.findFirst({ where: { id: input.customerId, tenantId: user.tenantId } });
  if (!customer) throw new CheckoutError("Customer not found.");
  const variants = await db.variant.findMany({
    where: { id: { in: input.items.map((i) => i.variantId) }, tenantId: user.tenantId, active: true },
    include: { item: { select: { name: true } } },
  });
  if (variants.length !== new Set(input.items.map((i) => i.variantId)).size) throw new CheckoutError("An item is no longer available.");
  if (input.assigneeId && !(await db.user.findFirst({ where: { id: input.assigneeId, tenantId: user.tenantId, active: true }, select: { id: true } }))) {
    throw new CheckoutError("Assigned staff member not found.");
  }
  let measurementId: string | null = null;
  let snapshot: Prisma.InputJsonValue | undefined;
  if (input.measurementId) {
    const m = await db.measurement.findFirst({ where: { id: input.measurementId, customerId: customer.id, tenantId: user.tenantId } });
    if (!m) throw new CheckoutError("Measurement not found.");
    measurementId = m.id;
    snapshot = { label: m.label, values: m.values as Prisma.InputJsonValue, notes: m.notes };
  }
  const estimate = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const advance = input.advance && input.advance.amount > 0 ? input.advance : null;
  if (advance && advance.amount > estimate) throw new CheckoutError("Advance can't be more than the order amount.");
  const byId = new Map(variants.map((v) => [v.id, v]));

  return db.$transaction(async (tx) => {
    if (input.newMeasurement && Object.keys(input.newMeasurement.values).length) {
      const m = await tx.measurement.create({
        data: { tenantId: user.tenantId, customerId: customer.id, takenById: user.id, label: input.newMeasurement.label, values: input.newMeasurement.values, notes: input.newMeasurement.notes || null },
      });
      measurementId = m.id;
      snapshot = { label: m.label, values: input.newMeasurement.values, notes: m.notes };
    }
    const number = await nextNumber(tx, user.tenantId, input.kind);
    const order = await tx.order.create({
      data: {
        tenantId: user.tenantId,
        storeId: store.id,
        number,
        kind: input.kind,
        status: input.kind === "JOB" ? (measurementId ? "MEASURED" : "RECEIVED") : "CONFIRMED",
        customerId: customer.id,
        assigneeId: input.assigneeId || null,
        createdById: user.id,
        dueDate: toDate(input.dueDate),
        trialDate: input.kind === "JOB" ? toDate(input.trialDate) : null,
        deliveryMode: input.deliveryMode,
        deliveryAddress: input.deliveryMode === "DELIVERY" ? input.deliveryAddress || null : null,
        notes: input.notes || null,
        designNotes: input.designNotes || null,
        measurementId,
        measurementSnapshot: snapshot,
        estimate,
        advancePaid: advance?.amount ?? 0,
        items: {
          create: input.items.map((i) => {
            const v = byId.get(i.variantId)!;
            const variant = [v.size, v.colour].filter(Boolean).join(" / ");
            return { variantId: v.id, description: variant ? `${v.item.name} — ${variant}` : v.item.name, qty: i.qty, price: i.price, note: i.note || null };
          }),
        },
        payments: advance ? { create: { method: advance.method, amount: advance.amount, reference: advance.reference || null, userId: user.id } } : undefined,
        events: { create: { userId: user.id, message: `Created${advance ? ` with advance` : ""}` } },
      },
    });
    if (input.kind === "ORDER") {
      const complete = await reserveLines(tx, order.id);
      if (!complete) {
        await tx.order.update({ where: { id: order.id }, data: { status: "AWAITING_STOCK" } });
        await tx.orderEvent.create({ data: { orderId: order.id, userId: user.id, status: "AWAITING_STOCK", message: "Some items aren't in stock yet" } });
      }
    }
    return order;
  });
}

async function loadForUpdate(tx: Tx, user: CurrentUser, orderId: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} AND "tenantId" = ${user.tenantId} FOR UPDATE`;
  const order = await tx.order.findFirst({ where: { id: orderId, tenantId: user.tenantId } });
  if (!order) throw new CheckoutError("Order not found.");
  return order;
}

/** Tailors may only move their own jobs; everyone with orders.manage may move any order. */
function assertCanWork(user: CurrentUser, order: { kind: string; assigneeId: string | null }) {
  if (can(user.role, "orders.manage")) return;
  if (can(user.role, "jobs.update") && order.kind === "JOB" && order.assigneeId === user.id) return;
  throw new CheckoutError("You can only update jobs assigned to you.");
}

export async function setOrderStatus(user: CurrentUser, orderId: string, status: OrderStatus, note?: string) {
  return db.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, user, orderId);
    assertCanWork(user, order);
    if (!isOpen(order.status)) throw new CheckoutError("This order is closed.");
    if (!manualStages(order.kind).includes(status)) throw new CheckoutError("That stage doesn't apply here.");
    if (status === order.status) return order;
    const updated = await tx.order.update({ where: { id: order.id }, data: { status } });
    await tx.orderEvent.create({ data: { orderId: order.id, userId: user.id, status, message: note?.trim() || `Moved to ${status}` } });
    return updated;
  });
}

export async function toggleHold(user: CurrentUser, orderId: string) {
  return db.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, user, orderId);
    assertCanWork(user, order);
    if (!isOpen(order.status)) throw new CheckoutError("This order is closed.");
    await tx.order.update({ where: { id: order.id }, data: { onHold: !order.onHold } });
    await tx.orderEvent.create({ data: { orderId: order.id, userId: user.id, message: order.onHold ? "Resumed from hold" : "Put on hold" } });
  });
}

export async function reserveOrderStock(user: CurrentUser, orderId: string) {
  return db.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, user, orderId);
    if (order.kind !== "ORDER" || !isOpen(order.status)) throw new CheckoutError("Nothing to reserve.");
    const complete = await reserveLines(tx, order.id);
    if (complete && order.status === "AWAITING_STOCK") {
      await tx.order.update({ where: { id: order.id }, data: { status: "CONFIRMED" } });
      await tx.orderEvent.create({ data: { orderId: order.id, userId: user.id, status: "CONFIRMED", message: "All items reserved" } });
    }
    return complete;
  });
}

export const paymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(METHODS),
  amount: z.number().int().min(1, "Enter an amount").max(100_000_000),
  reference: z.string().trim().max(60).optional(),
});

export async function addOrderPayment(user: CurrentUser, input: z.infer<typeof paymentSchema>) {
  return db.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, user, input.orderId);
    if (!isOpen(order.status) || order.saleId) throw new CheckoutError("This order is closed. Take payment on its bill.");
    if (order.advancePaid + input.amount > order.estimate) throw new CheckoutError("That's more than the order amount.");
    await tx.orderPayment.create({ data: { orderId: order.id, userId: user.id, method: input.method, amount: input.amount, reference: input.reference || null } });
    await tx.order.update({ where: { id: order.id }, data: { advancePaid: { increment: input.amount } } });
    await tx.orderEvent.create({ data: { orderId: order.id, userId: user.id, message: `Advance received` } });
  });
}

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(3, "Enter a reason").max(200),
  refundMethod: z.enum(METHODS).default("CASH"),
  keepAdvance: z.boolean().default(false),
});

export async function cancelOrder(user: CurrentUser, input: z.infer<typeof cancelOrderSchema>) {
  if (!can(user.role, "billing.refund")) throw new CheckoutError("Ask a manager to cancel orders.");
  return db.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, user, input.orderId);
    if (!isOpen(order.status) || order.saleId) throw new CheckoutError("This order is already closed.");
    await releaseReservations(tx, order.id);
    if (order.advancePaid > 0 && !input.keepAdvance) {
      await tx.orderPayment.create({ data: { orderId: order.id, userId: user.id, method: input.refundMethod, amount: -order.advancePaid, reference: "Refund on cancel" } });
    }
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", completedAt: new Date(), advancePaid: input.keepAdvance ? order.advancePaid : 0 },
    });
    await tx.orderEvent.create({ data: { orderId: order.id, userId: user.id, status: "CANCELLED", message: input.reason } });
  });
}

export const detailsSchema = z.object({
  orderId: z.string().min(1),
  dueDate: dateStr,
  trialDate: dateStr,
  assigneeId: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function updateOrderDetails(user: CurrentUser, input: z.infer<typeof detailsSchema>) {
  return db.$transaction(async (tx) => {
    const order = await loadForUpdate(tx, user, input.orderId);
    if (!isOpen(order.status)) throw new CheckoutError("This order is closed.");
    if (input.assigneeId && !(await tx.user.findFirst({ where: { id: input.assigneeId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new CheckoutError("Staff member not found.");
    }
    await tx.order.update({
      where: { id: order.id },
      data: { dueDate: toDate(input.dueDate), trialDate: order.kind === "JOB" ? toDate(input.trialDate) : null, assigneeId: input.assigneeId || null, notes: input.notes || null },
    });
    await tx.orderEvent.create({ data: { orderId: order.id, userId: user.id, message: "Details updated" } });
  });
}

