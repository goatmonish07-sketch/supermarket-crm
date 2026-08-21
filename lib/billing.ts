import { round2 } from "./format";

export type CartLine = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  taxRate: number; // GST %
  stock?: number;
  unit?: string;
};

export type BillTotals = {
  subtotal: number; // pre-tax after line values
  taxTotal: number;
  discount: number;
  grandTotal: number;
  cgst: number;
  sgst: number;
};

/**
 * Compute bill totals. Prices are treated as tax-exclusive; GST is added on top.
 * Invoice-level discount is applied to the pre-tax subtotal proportionally.
 */
export function computeTotals(lines: CartLine[], discount = 0): BillTotals {
  const rawSubtotal = round2(
    lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
  );
  const safeDiscount = Math.min(Math.max(discount, 0), rawSubtotal);
  const discountFactor = rawSubtotal > 0 ? (rawSubtotal - safeDiscount) / rawSubtotal : 1;

  let taxTotal = 0;
  for (const l of lines) {
    const lineBase = l.qty * l.unitPrice * discountFactor;
    taxTotal += (lineBase * l.taxRate) / 100;
  }
  taxTotal = round2(taxTotal);

  const subtotal = round2(rawSubtotal - safeDiscount);
  const grandTotal = round2(subtotal + taxTotal);

  return {
    subtotal,
    taxTotal,
    discount: round2(safeDiscount),
    grandTotal,
    cgst: round2(taxTotal / 2),
    sgst: round2(taxTotal / 2),
  };
}

export function lineTotal(line: CartLine): number {
  return round2(line.qty * line.unitPrice);
}

export function loyaltyPointsFor(amount: number, rate: number): number {
  if (!rate || rate <= 0) return 0;
  return Math.floor(amount / rate);
}
