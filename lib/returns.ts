import "server-only";
import { z } from "zod";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { can } from "./permissions";
import { tracksStock } from "./catalogue";
import { approvalSchema, CheckoutError, verifyApproval } from "./checkout";

export const returnSchema = z.object({
  saleId: z.string().min(1),
  lines: z.array(z.object({ saleItemId: z.string().min(1), qty: z.number().int().min(0).max(999) })).min(1),
  method: z.enum(["CASH", "CARD", "UPI", "BANK", "OTHER"]),
  reason: z.string().trim().max(200).optional(),
  approval: approvalSchema,
});

export const cancelSchema = z.object({
  saleId: z.string().min(1),
  reason: z.string().trim().min(3, "Enter a reason").max(200),
  approval: approvalSchema,
});

/** Share of a line's paid total for `qty` units; the last unit absorbs rounding. */
function refundFor(item: { qty: number; total: number; returnedQty: number }, qty: number) {
  if (item.returnedQty + qty === item.qty) {
    const alreadyRefunded = Math.round((item.total * item.returnedQty) / item.qty);
    return item.total - alreadyRefunded;
  }
  return Math.round((item.total * qty) / item.qty);
}

async function authorise(user: CurrentUser, approval: z.infer<typeof approvalSchema>, what: string) {
  if (can(user.role, "billing.refund")) return user.id;
  return verifyApproval(user, approval, what);
}

export async function returnItems(user: CurrentUser, input: z.infer<typeof returnSchema>) {
  const approverId = await authorise(user, input.approval, "Returns");
  const wanted = input.lines.filter((l) => l.qty > 0);
  if (!wanted.length) throw new CheckoutError("Choose at least one item to return.");

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Sale" WHERE id = ${input.saleId} AND "tenantId" = ${user.tenantId} FOR UPDATE`;
    const sale = await tx.sale.findFirst({ where: { id: input.saleId, tenantId: user.tenantId }, include: { items: true } });
    if (!sale) throw new CheckoutError("Bill not found.");
    if (sale.status === "CANCELLED") throw new CheckoutError("This bill is cancelled.");

    let amount = 0;
    const lines: { saleItemId: string; qty: number; amount: number }[] = [];
    for (const w of wanted) {
      const item = sale.items.find((i) => i.id === w.saleItemId);
      if (!item) throw new CheckoutError("Item not on this bill.");
      if (w.qty > item.qty - item.returnedQty) throw new CheckoutError(`Only ${item.qty - item.returnedQty} of “${item.name}” can be returned.`);
      const lineAmount = refundFor(item, w.qty);
      amount += lineAmount;
      lines.push({ saleItemId: item.id, qty: w.qty, amount: lineAmount });
      await tx.saleItem.update({ where: { id: item.id }, data: { returnedQty: { increment: w.qty } } });

      if (item.variantId && tracksStock(item.itemType)) {
        const v = await tx.variant.update({ where: { id: item.variantId }, data: { onHand: { increment: w.qty } } });
        await tx.stockMovement.create({
          data: { tenantId: user.tenantId, variantId: v.id, userId: user.id, type: "RETURN", qty: w.qty, balanceAfter: v.onHand, reason: `Return ${sale.number}` },
        });
      }
    }

    // Never refund more than was actually paid on the bill.
    const refundable = Math.max(0, sale.paidTotal - sale.refundedTotal);
    const refund = Math.min(amount, refundable);

    const items = await tx.saleItem.findMany({ where: { saleId: sale.id } });
    const allBack = items.every((i) => i.returnedQty >= i.qty);
    await tx.sale.update({
      where: { id: sale.id },
      data: { refundedTotal: { increment: refund }, returnState: allBack ? "RETURNED" : "PARTLY_RETURNED" },
    });
    if (refund > 0) await tx.payment.create({ data: { saleId: sale.id, method: input.method, amount: -refund, reference: "Refund" } });
    await tx.saleReturn.create({
      data: { tenantId: user.tenantId, saleId: sale.id, userId: approverId, amount: refund, method: input.method, reason: input.reason || null, lines },
    });
    return { number: sale.number, refund };
  });
}

export async function cancelSale(user: CurrentUser, input: z.infer<typeof cancelSchema>) {
  const approverId = await authorise(user, input.approval, "Cancelling a bill");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Sale" WHERE id = ${input.saleId} AND "tenantId" = ${user.tenantId} FOR UPDATE`;
    const sale = await tx.sale.findFirst({ where: { id: input.saleId, tenantId: user.tenantId }, include: { items: true, payments: true } });
    if (!sale) throw new CheckoutError("Bill not found.");
    if (sale.status === "CANCELLED") throw new CheckoutError("Already cancelled.");

    for (const item of sale.items) {
      const back = item.qty - item.returnedQty;
      if (back > 0 && item.variantId && tracksStock(item.itemType)) {
        const v = await tx.variant.update({ where: { id: item.variantId }, data: { onHand: { increment: back } } });
        await tx.stockMovement.create({
          data: { tenantId: user.tenantId, variantId: v.id, userId: user.id, type: "RETURN", qty: back, balanceAfter: v.onHand, reason: `Cancelled ${sale.number}` },
        });
      }
    }
    // Reverse what is still held, per payment method.
    const net = new Map<string, number>();
    for (const p of sale.payments) net.set(p.method, (net.get(p.method) ?? 0) + p.amount);
    for (const [method, amount] of net) {
      if (amount > 0) {
        await tx.payment.create({ data: { saleId: sale.id, method: method as "CASH", amount: -amount, reference: "Cancelled" } });
      }
    }
    const refundedNow = [...net.values()].reduce((s, a) => s + Math.max(0, a), 0);
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: input.reason,
        approvedById: approverId === user.id ? sale.approvedById : approverId,
        refundedTotal: { increment: refundedNow },
      },
    });
    return { number: sale.number };
  });
}
