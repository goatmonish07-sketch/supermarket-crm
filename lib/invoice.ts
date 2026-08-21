import { query, queryFirst, execute, newId, nowSql } from "./d1";
import { getSettings } from "./settings";
import { computeTotals, loyaltyPointsFor, type CartLine } from "./billing";
import { round2 } from "./format";

export type CreateInvoiceInput = {
  items: { productId: string; qty: number }[];
  customerId?: string | null;
  discount?: number;
  paymentMode?: "CASH" | "CARD" | "UPI" | "CREDIT";
  paidAmount?: number;
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

  const settings = await getSettings();

  const ids = input.items.map((i) => i.productId);
  const placeholders = ids.map(() => "?").join(",");
  const products = await query<{ id: string; name: string; sellPrice: number; taxRate: number; stock: number; unit: string }>(
    `SELECT id, name, sellPrice, taxRate, stock, unit FROM Product WHERE id IN (${placeholders})`,
    ids,
  );
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
    const now = new Date();
    const dateKey = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`;
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const cntRow = await queryFirst<{ n: number }>(
      `SELECT COUNT(*) AS n FROM Invoice WHERE createdAt >= ?`,
      [start.toISOString().replace("T", " ").slice(0, 19)],
    );
    const invoiceNo = `INV-${dateKey}-${pad((cntRow?.n ?? 0) + 1, 4)}`;
    const invoiceId = newId("inv");
    const createdAt = nowSql();

    await execute(
      `INSERT INTO Invoice (id, invoiceNo, customerId, userId, subtotal, taxTotal, discount, grandTotal, paymentMode, paidAmount, dueAmount, status, note, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceId, invoiceNo, input.customerId || null, userId, totals.subtotal, totals.taxTotal, totals.discount, totals.grandTotal, paymentMode, paidAmount, dueAmount, status, input.note || null, createdAt],
    );

    for (const l of lines) {
      await execute(
        `INSERT INTO InvoiceItem (id, invoiceId, productId, name, qty, unitPrice, taxRate, lineTotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId("item"), invoiceId, l.productId, l.name, l.qty, l.unitPrice, l.taxRate, round2(l.qty * l.unitPrice)],
      );
      await execute(`UPDATE Product SET stock = stock - ? WHERE id = ?`, [l.qty, l.productId]);
      await execute(
        `INSERT INTO StockMovement (id, productId, qtyChange, type, note, createdAt) VALUES (?, ?, ?, 'SALE', ?, ?)`,
        [newId("mov"), l.productId, -l.qty, invoiceNo, createdAt],
      );
    }

    if (input.customerId) {
      await execute(
        `UPDATE Customer SET loyaltyPoints = loyaltyPoints + ?, dueBalance = dueBalance + ? WHERE id = ?`,
        [loyaltyEarned, dueAmount, input.customerId],
      );
    }

    return { ok: true, invoiceId, invoiceNo, grandTotal: totals.grandTotal, loyaltyEarned };
  } catch (e) {
    console.error("createInvoice failed", e);
    return { ok: false, error: "Failed to create invoice. Please try again." };
  }
}
