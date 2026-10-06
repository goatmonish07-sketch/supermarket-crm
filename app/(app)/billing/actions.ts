"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { checkout, checkoutSchema, CheckoutError, type CheckoutResult } from "@/lib/checkout";
import { cancelSale, cancelSchema, returnItems, returnSchema } from "@/lib/returns";
import { formatMoney } from "@/lib/utils";

type Result = { ok: true; message?: string } | { ok: false; error: string; needsApproval?: boolean };

function fail(e: unknown): { ok: false; error: string; needsApproval?: boolean } {
  if (e instanceof CheckoutError) return { ok: false, error: e.message, needsApproval: e.needsApproval };
  throw e;
}

export async function checkoutAction(input: unknown): Promise<CheckoutResult> {
  const user = await requirePermission("billing.use");
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const saleId = await checkout(user, parsed.data);
    await audit(user.tenantId, user.id, "sale.create", { entity: "sale", entityId: saleId });
    if (parsed.data.heldBillId) await db.heldBill.deleteMany({ where: { id: parsed.data.heldBillId, tenantId: user.tenantId } });
    revalidatePath("/dashboard");
    revalidatePath("/billing");
    revalidatePath("/inventory");
    return { ok: true, saleId };
  } catch (e) {
    return fail(e);
  }
}

const holdSchema = z.object({ label: z.string().trim().min(1).max(60), payload: z.unknown() });

export async function holdBillAction(input: unknown): Promise<Result> {
  const user = await requirePermission("billing.use");
  const parsed = holdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Could not hold this bill." };
  const count = await db.heldBill.count({ where: { tenantId: user.tenantId } });
  if (count >= 30) return { ok: false, error: "Too many held bills. Resume or discard some first." };
  await db.heldBill.create({ data: { tenantId: user.tenantId, userId: user.id, label: parsed.data.label, payload: parsed.data.payload as object } });
  revalidatePath("/billing");
  return { ok: true, message: "Bill held" };
}

export async function discardHeldAction(id: string): Promise<Result> {
  const user = await requirePermission("billing.use");
  await db.heldBill.deleteMany({ where: { id, tenantId: user.tenantId } });
  revalidatePath("/billing");
  return { ok: true };
}

export async function findCustomerAction(phone: string) {
  const user = await requirePermission("billing.use");
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 4) return [];
  return db.customer.findMany({
    where: { tenantId: user.tenantId, phone: { contains: digits } },
    select: { id: true, name: true, phone: true },
    take: 6,
    orderBy: { updatedAt: "desc" },
  });
}

const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name").max(80),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a 10-digit mobile number"),
});

export async function createCustomerAction(input: unknown): Promise<{ ok: true; customer: { id: string; name: string; phone: string } } | { ok: false; error: string }> {
  const user = await requirePermission("customers.manage");
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const customer = await db.customer.upsert({
    where: { tenantId_phone: { tenantId: user.tenantId, phone: parsed.data.phone } },
    update: {},
    create: { tenantId: user.tenantId, ...parsed.data },
    select: { id: true, name: true, phone: true },
  });
  return { ok: true, customer };
}

export async function returnItemsAction(input: unknown): Promise<Result> {
  const user = await requirePermission("billing.use");
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const r = await returnItems(user, parsed.data);
    await audit(user.tenantId, user.id, "sale.return", { entity: "sale", entityId: parsed.data.saleId, details: { refund: r.refund } });
    revalidatePath(`/billing/bills/${parsed.data.saleId}`);
    revalidatePath("/inventory");
    return { ok: true, message: `Return saved on ${r.number}. Refund ${formatMoney(r.refund)}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelSaleAction(input: unknown): Promise<Result> {
  const user = await requirePermission("billing.use");
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const r = await cancelSale(user, parsed.data);
    await audit(user.tenantId, user.id, "sale.cancel", { entity: "sale", entityId: parsed.data.saleId, details: { reason: parsed.data.reason } });
    revalidatePath(`/billing/bills/${parsed.data.saleId}`);
    revalidatePath("/inventory");
    return { ok: true, message: `${r.number} cancelled and stock returned.` };
  } catch (e) {
    return fail(e);
  }
}
