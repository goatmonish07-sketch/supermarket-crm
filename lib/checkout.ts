import "server-only";
import { z } from "zod";
import type { PaymentMethod, Prisma } from "@prisma/client";
import { db } from "./db";
import { checkSecret, type CurrentUser } from "./auth";
import { can } from "./permissions";
import { available, tracksStock } from "./catalogue";
import { calculateBill, financialYear, formatInvoiceNumber, resolveDiscount, type CalcLineInput } from "./billing";
import { formatMoney } from "./utils";

const METHODS = ["CASH", "CARD", "UPI", "BANK", "OTHER"] as const;

export const approvalSchema = z.object({ userId: z.string().min(1), pin: z.string().regex(/^\d{4,6}$/) }).optional();

export const checkoutSchema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        qty: z.number().int().min(1).max(999),
        priceOverride: z.number().int().min(0).max(100_000_000).nullable().optional(),
        discount: z.string().max(20).default(""),
        note: z.string().trim().max(200).optional(),
      }),
    )
    .min(1, "Add at least one item")
    .max(200),
  billDiscount: z.string().max(20).default(""),
  customerId: z.string().nullable().optional(),
  salespersonId: z.string().nullable().optional(),
  payments: z
    .array(z.object({ method: z.enum(METHODS), amount: z.number().int().min(1).max(1_000_000_000), reference: z.string().trim().max(60).optional() }))
    .max(6),
  note: z.string().trim().max(300).optional(),
  heldBillId: z.string().optional(),
  approval: approvalSchema,
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutResult = { ok: true; saleId: string } | { ok: false; error: string; needsApproval?: boolean };

export class CheckoutError extends Error {
  constructor(
    message: string,
    public needsApproval = false,
  ) {
    super(message);
  }
}

/** Validate a manager PIN for an action the current user may not do alone. Returns approver id. */
export async function verifyApproval(user: CurrentUser, approval: CheckoutInput["approval"], what: string) {
  if (!approval) throw new CheckoutError(`${what} needs a manager's approval.`, true);
  const approver = await db.user.findFirst({ where: { id: approval.userId, tenantId: user.tenantId, active: true } });
  if (!approver || !can(approver.role, "billing.discount.override") || !(await checkSecret(approval.pin, approver.pinHash))) {
    throw new CheckoutError("Approval PIN is not correct.", true);
  }
  return approver.id;
}

export async function checkout(user: CurrentUser, input: CheckoutInput): Promise<string> {
  const store = user.store;
  if (!store) throw new CheckoutError("Your account isn't linked to a store.");

  const variantIds = [...new Set(input.lines.map((l) => l.variantId))];
  const variants = await db.variant.findMany({
    where: { id: { in: variantIds }, tenantId: user.tenantId, active: true, item: { active: true } },
    include: { item: true },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const missing = input.lines.find((l) => !byId.has(l.variantId));
  if (missing) throw new CheckoutError("An item in the cart is no longer available. Remove it and try again.");

  // Build calculation lines from database prices.
  let needsOverride = false;
  const calcInputs: CalcLineInput[] = input.lines.map((l, i) => {
    const v = byId.get(l.variantId)!;
    let unitPrice = v.price;
    if (l.priceOverride != null && l.priceOverride !== v.price) {
      if (!(v.item.priceAtCounter && v.price === 0)) needsOverride = true;
      unitPrice = l.priceOverride;
    }
    if (unitPrice <= 0 && v.item.priceAtCounter) throw new CheckoutError(`Enter a price for “${v.item.name}”.`);
    return {
      key: String(i),
      unitPrice,
      qty: l.qty,
      lineDiscount: resolveDiscount(l.discount, unitPrice * l.qty),
      taxInclusive: v.item.taxInclusive,
      gstRateBp: v.item.gstRateBp,
      gstSlabAbove: v.item.gstSlabAbove,
      gstHighRateBp: v.item.gstHighRateBp,
      mrp: v.mrp,
    };
  });
  const netBeforeBill = calcInputs.reduce((s, l) => s + Math.max(0, l.unitPrice * l.qty - l.lineDiscount), 0);
  const bill = calculateBill(calcInputs, resolveDiscount(input.billDiscount, netBeforeBill), store.roundOff);

  // Discount / price-change limits.
  let approvedById: string | null = null;
  const discountBp = bill.gross > 0 ? Math.round((bill.discountTotal * 10000) / bill.gross) : 0;
  const overLimit = discountBp > store.cashierMaxDiscountBp;
  if ((overLimit || needsOverride) && !can(user.role, "billing.discount.override")) {
    const what = needsOverride ? "Changing a price" : `A discount above ${store.cashierMaxDiscountBp / 100}%`;
    approvedById = await verifyApproval(user, input.approval, what);
  }

  // Payments: card/UPI/bank can't exceed the bill; cash may (change is returned).
  const paidNonCash = input.payments.filter((p) => p.method !== "CASH").reduce((s, p) => s + p.amount, 0);
  const cashTendered = input.payments.filter((p) => p.method === "CASH").reduce((s, p) => s + p.amount, 0);
  if (paidNonCash > bill.payable) throw new CheckoutError("Card / UPI amount is more than the bill.");
  const cashKept = Math.min(cashTendered, bill.payable - paidNonCash);
  const change = cashTendered - cashKept;
  const paidTotal = paidNonCash + cashKept;
  const due = bill.payable - paidTotal;
  if (due > 0 && !input.customerId) {
    throw new CheckoutError(`${formatMoney(due)} is still due. Collect it, or add the customer to record it as credit.`);
  }

  if (input.customerId) {
    const c = await db.customer.findFirst({ where: { id: input.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!c) throw new CheckoutError("Customer not found.");
  }
  if (input.salespersonId) {
    const sp = await db.user.findFirst({ where: { id: input.salespersonId, tenantId: user.tenantId }, select: { id: true } });
    if (!sp) throw new CheckoutError("Salesperson not found.");
  }

  // Stock needed per variant.
  const need = new Map<string, number>();
  input.lines.forEach((l) => {
    if (tracksStock(byId.get(l.variantId)!.item.type)) need.set(l.variantId, (need.get(l.variantId) ?? 0) + l.qty);
  });

  const fy = financialYear(new Date(), store.timezone);
  const sale = await db.$transaction(async (tx) => {
    // Lock stock rows in a stable order to avoid deadlocks between counters.
    const lockIds = [...need.keys()].sort();
    if (lockIds.length) {
      await tx.$queryRaw`SELECT id FROM "Variant" WHERE id = ANY(${lockIds}::text[]) ORDER BY id FOR UPDATE`;
    }
    const fresh = await tx.variant.findMany({ where: { id: { in: lockIds } } });
    if (!store.allowNegativeStock) {
      const short = fresh.filter((v) => available(v) < (need.get(v.id) ?? 0));
      if (short.length) {
        const names = short.map((v) => {
          const base = byId.get(v.id)!;
          const label = [base.item.name, [v.size, v.colour].filter(Boolean).join(" / ")].filter(Boolean).join(" — ");
          return `${label} (only ${Math.max(0, available(v))} left)`;
        });
        throw new CheckoutError(`Not enough stock: ${names.join(", ")}`);
      }
    }

    const [{ last }] = await tx.$queryRaw<{ last: number }[]>`
      INSERT INTO "InvoiceCounter" ("storeId", "fy", "last") VALUES (${store.id}, ${fy}, 1)
      ON CONFLICT ("storeId", "fy") DO UPDATE SET "last" = "InvoiceCounter"."last" + 1
      RETURNING "last"`;

    const payments: Prisma.PaymentCreateManySaleInput[] = [];
    for (const p of input.payments) {
      if (p.method === "CASH") continue;
      payments.push({ method: p.method as PaymentMethod, amount: p.amount, reference: p.reference || null });
    }
    if (cashKept > 0) payments.push({ method: "CASH", amount: cashKept });

    const created = await tx.sale.create({
      data: {
        tenantId: user.tenantId,
        storeId: store.id,
        number: formatInvoiceNumber(store.invoicePrefix, fy, last),
        fy,
        seq: last,
        status: due <= 0 ? "PAID" : paidTotal > 0 ? "PARTLY_PAID" : "UNPAID",
        customerId: input.customerId || null,
        cashierId: user.id,
        salespersonId: input.salespersonId || null,
        grossTotal: bill.gross,
        discountTotal: bill.discountTotal,
        billDiscount: bill.billDiscount,
        taxableTotal: bill.taxable,
        taxTotal: bill.tax,
        roundOff: bill.roundOff,
        total: bill.payable,
        paidTotal,
        changeGiven: change,
        approvedById,
        note: input.note || null,
        items: {
          create: bill.lines.map((l, i) => {
            const v = byId.get(input.lines[i].variantId)!;
            return {
              variantId: v.id,
              name: v.item.name,
              size: v.size,
              colour: v.colour,
              sku: v.sku,
              taxCode: v.item.taxCode,
              itemType: v.item.type,
              qty: l.qty,
              unitPrice: l.unitPrice,
              lineDiscount: l.lineDiscount + l.billDiscountShare,
              taxRateBp: l.rateBp,
              taxable: l.taxable,
              tax: l.tax,
              total: l.total,
              note: input.lines[i].note || null,
            };
          }),
        },
        payments: { createMany: { data: payments } },
      },
    });

    for (const v of fresh) {
      const qty = need.get(v.id) ?? 0;
      const onHand = v.onHand - qty;
      await tx.variant.update({ where: { id: v.id }, data: { onHand } });
      await tx.stockMovement.create({
        data: { tenantId: user.tenantId, variantId: v.id, userId: user.id, type: "SALE", qty: -qty, balanceAfter: onHand, reason: created.number },
      });
    }
    return created;
  });

  return sale.id;
}
