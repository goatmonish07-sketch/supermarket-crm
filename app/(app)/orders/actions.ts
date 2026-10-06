"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CheckoutError } from "@/lib/checkout";
import {
  addOrderPayment,
  cancelOrder,
  cancelOrderSchema,
  createOrder,
  createOrderSchema,
  detailsSchema,
  paymentSchema,
  reserveOrderStock,
  setOrderStatus,
  toggleHold,
  updateOrderDetails,
} from "@/lib/orders-server";

type Result = { ok: true; id?: string; message?: string } | { ok: false; error: string };

async function guard(manage = true) {
  const user = await requireUser();
  if (manage ? !can(user.role, "orders.manage") : !can(user.role, "orders.manage") && !can(user.role, "jobs.update")) {
    throw new CheckoutError("You don't have access to orders.");
  }
  return user;
}

async function run(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    throw e;
  }
}

const refresh = (id?: string) => {
  revalidatePath("/orders");
  if (id) revalidatePath(`/orders/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
};

export async function createOrderAction(input: unknown): Promise<Result> {
  return run(async () => {
    const user = await guard();
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const order = await createOrder(user, parsed.data);
    await audit(user.tenantId, user.id, "order.create", { entity: "order", entityId: order.id });
    refresh();
    return { ok: true, id: order.id };
  });
}

export async function setStatusAction(orderId: string, status: OrderStatus, note?: string): Promise<Result> {
  return run(async () => {
    const user = await guard(false);
    await setOrderStatus(user, orderId, status, note);
    refresh(orderId);
    return { ok: true };
  });
}

export async function toggleHoldAction(orderId: string): Promise<Result> {
  return run(async () => {
    const user = await guard(false);
    await toggleHold(user, orderId);
    refresh(orderId);
    return { ok: true };
  });
}

export async function reserveStockAction(orderId: string): Promise<Result> {
  return run(async () => {
    const user = await guard();
    const complete = await reserveOrderStock(user, orderId);
    refresh(orderId);
    return { ok: true, message: complete ? "All items are now reserved." : "Reserved what's available. Some items are still short." };
  });
}

export async function addPaymentAction(input: unknown): Promise<Result> {
  return run(async () => {
    const user = await guard();
    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await addOrderPayment(user, parsed.data);
    await audit(user.tenantId, user.id, "order.payment", { entity: "order", entityId: parsed.data.orderId, details: { amount: parsed.data.amount } });
    refresh(parsed.data.orderId);
    return { ok: true, message: "Payment recorded." };
  });
}

export async function cancelOrderAction(input: unknown): Promise<Result> {
  return run(async () => {
    const user = await guard();
    const parsed = cancelOrderSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await cancelOrder(user, parsed.data);
    await audit(user.tenantId, user.id, "order.cancel", { entity: "order", entityId: parsed.data.orderId, details: { reason: parsed.data.reason } });
    refresh(parsed.data.orderId);
    return { ok: true, message: "Order cancelled. Held stock released." };
  });
}

export async function updateDetailsAction(input: unknown): Promise<Result> {
  return run(async () => {
    const user = await guard();
    const parsed = detailsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    await updateOrderDetails(user, parsed.data);
    refresh(parsed.data.orderId);
    return { ok: true, message: "Saved." };
  });
}

export async function customerMeasurementsAction(customerId: string) {
  const user = await guard();
  const rows = await db.measurement.findMany({ where: { tenantId: user.tenantId, customerId }, orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map((m) => ({ id: m.id, label: m.label, values: m.values as Record<string, number>, notes: m.notes, createdAt: m.createdAt.toISOString() }));
}

const measurementSchema = z.object({
  customerId: z.string().min(1),
  label: z.string().trim().min(1, "Choose a garment").max(40),
  values: z.record(z.string().max(40), z.number().min(0).max(200)),
  notes: z.string().trim().max(300).optional(),
});

export async function saveMeasurementAction(input: unknown): Promise<Result> {
  return run(async () => {
    const user = await requireUser();
    if (!can(user.role, "customers.manage") && !can(user.role, "jobs.update")) return { ok: false, error: "Not allowed." };
    const parsed = measurementSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    if (!Object.keys(parsed.data.values).length) return { ok: false, error: "Enter at least one measurement." };
      const customer = await db.customer.findFirst({ where: { id: parsed.data.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!customer) return { ok: false, error: "Customer not found." };
    const m = await db.measurement.create({
      data: { tenantId: user.tenantId, customerId: customer.id, takenById: user.id, label: parsed.data.label, values: parsed.data.values, notes: parsed.data.notes || null },
    });
    revalidatePath(`/customers/${customer.id}`);
    return { ok: true, id: m.id, message: "Measurements saved." };
  });
}
