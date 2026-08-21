import { getDb } from "./db";
import { getSettings } from "./settings";
import { computeTotals, loyaltyPointsFor, type CartLine } from "./billing";
import { round2 } from "./format";

export type CreateInvoiceInput = {
  items: { productId: string; qty: number }[];
  customerId?: string | null;
  discount?: number;
  paymentMode?: "CASH" | "CARD" | "UPI" | "CREDIT";
  paidAmount?: number; // if omitted, assumed fully paid
  note?: string;
};

export type CreateInvoiceResult =
  | { ok: true; invoiceId: string; invoiceNo: string; grandTotal: number; loyaltyEarned: number }
  | { ok: false; error: string };

function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

export async function createInvoice(userId: string, input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  if (!input.items?.length) return { ok: false, error: "Cart is empty." };

  const prisma = getDb();
  const settings = await getSettings();

  // Load products fresh — never trust client-side prices/stock.
  const ids = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: CartLine[] = [];
  for (const item of input.items) {
    const p = byId.get(item.productId);
    if (!p) return { ok: false, error: `Product not found.` };
    const qty = Number(item.qty);
    if (!qty || qty <= 0) return { ok: false, error: `Invalid quantity for ${p.name}.` };
    if (qty > p.stock) return { ok: false, error: `Only ${p.stock} ${p.unit} of ${p.name} in stock.` };
    lines.push({ productId: p.id, name: p.name, qty, unitPrice: p.sellPrice, taxRate: p.taxRate });
  }

  const totals = computeTotals(lines, input.discount ?? 0);
  const paymentMode = input.paymentMode ?? "CASH";
  const paidAmount =
    input.paidAmount === undefined || input.paidAmount === null
      ? totals.grandTotal
      : round2(Math.max(0, Math.min(input.paidAmount, totals.grandTotal)));
  const dueAmount = round2(totals.grandTotal - paidAmount);
  const status = dueAmount <= 0 ? "PAID" : paidAmount <= 0 ? "DUE" : "PARTIAL";

  if (dueAmount > 0 && !input.customerId) {
    return { ok: false, error: "Select a customer to record credit / dues." };
  }

  const loyaltyEarned = loyaltyPointsFor(totals.grandTotal, settings.loyaltyRate);

  try {
    // NOTE: Cloudflare D1 does not support interactive transactions, so these
    // writes run sequentially. Values were validated above, so partial failure
    // is unlikely; acceptable for this workload.
    const now = new Date();
    const dateKey = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`;
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const todayCount = await prisma.invoice.count({ where: { createdAt: { gte: start } } });
    const invoiceNo = `INV-${dateKey}-${pad(todayCount + 1, 4)}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        customerId: input.customerId || null,
        userId,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discount: totals.discount,
        grandTotal: totals.grandTotal,
        paymentMode,
        paidAmount,
        dueAmount,
        status,
        note: input.note || null,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            name: l.name,
            qty: l.qty,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            lineTotal: round2(l.qty * l.unitPrice),
          })),
        },
      },
    });

    // Decrement stock + audit trail
    for (const l of lines) {
      await prisma.product.update({
        where: { id: l.productId },
        data: { stock: { decrement: l.qty } },
      });
      await prisma.stockMovement.create({
        data: { productId: l.productId, qtyChange: -l.qty, type: "SALE", note: invoiceNo },
      });
    }

    // Customer loyalty + dues
    if (input.customerId) {
      await prisma.customer.update({
        where: { id: input.customerId },
        data: {
          loyaltyPoints: { increment: loyaltyEarned },
          dueBalance: { increment: dueAmount },
        },
      });
    }

    return { ok: true, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, grandTotal: totals.grandTotal, loyaltyEarned };
  } catch (e) {
    console.error("createInvoice failed", e);
    return { ok: false, error: "Failed to create invoice. Please try again." };
  }
}
