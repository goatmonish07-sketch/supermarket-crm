// Pure bill maths shared by the counter screen (live totals) and the server
// (authoritative totals). All money is integer paise; rates are basis points.

export type CalcLineInput = {
  key: string;
  unitPrice: number; // list price per unit
  qty: number;
  lineDiscount: number; // paise off this line (already resolved from % or ₹)
  taxInclusive: boolean;
  gstRateBp: number;
  gstSlabAbove?: number | null; // per-piece taxable value threshold
  gstHighRateBp?: number | null;
  mrp?: number; // for the "you saved" line
};

export type CalcLine = CalcLineInput & {
  billDiscountShare: number;
  net: number; // after all discounts, before tax split (incl. tax when inclusive)
  rateBp: number;
  taxable: number;
  tax: number;
  total: number;
};

export type TaxRow = { rateBp: number; taxable: number; cgst: number; sgst: number };

export type BillTotals = {
  lines: CalcLine[];
  gross: number;
  lineDiscounts: number;
  billDiscount: number;
  discountTotal: number;
  taxable: number;
  tax: number;
  beforeRound: number;
  roundOff: number;
  payable: number;
  savings: number; // MRP savings + discounts
  taxRows: TaxRow[];
  itemCount: number;
};

/** Split `amount` across `weights` proportionally; remainders go to the largest fractions so the sum is exact. */
export function allocate(amount: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (amount <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / total);
  const floors = raw.map(Math.floor);
  let left = amount - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

/** Rate for a line, applying the garment value slab when configured. */
export function effectiveRate(l: Pick<CalcLineInput, "taxInclusive" | "gstRateBp" | "gstSlabAbove" | "gstHighRateBp">, net: number, qty: number) {
  if (!l.gstSlabAbove || l.gstHighRateBp == null || qty <= 0) return l.gstRateBp;
  const perUnit = net / qty;
  const taxableAtLow = l.taxInclusive ? (perUnit * 10000) / (10000 + l.gstRateBp) : perUnit;
  return taxableAtLow > l.gstSlabAbove ? l.gstHighRateBp : l.gstRateBp;
}

export function calculateBill(inputs: CalcLineInput[], billDiscount: number, roundOff: boolean): BillTotals {
  const preNet = inputs.map((l) => Math.max(0, l.unitPrice * l.qty - Math.min(l.lineDiscount, l.unitPrice * l.qty)));
  const billDisc = Math.min(Math.max(0, billDiscount), preNet.reduce((a, b) => a + b, 0));
  const shares = allocate(billDisc, preNet);

  const lines: CalcLine[] = inputs.map((l, i) => {
    const net = preNet[i] - shares[i];
    const rateBp = effectiveRate(l, net, l.qty);
    const taxable = l.taxInclusive ? Math.round((net * 10000) / (10000 + rateBp)) : net;
    const tax = l.taxInclusive ? net - taxable : Math.round((net * rateBp) / 10000);
    return { ...l, lineDiscount: Math.min(l.lineDiscount, l.unitPrice * l.qty), billDiscountShare: shares[i], net, rateBp, taxable, tax, total: taxable + tax };
  });

  const sum = (f: (l: CalcLine) => number) => lines.reduce((a, l) => a + f(l), 0);
  const gross = sum((l) => l.unitPrice * l.qty);
  const lineDiscounts = sum((l) => l.lineDiscount);
  const taxable = sum((l) => l.taxable);
  const tax = sum((l) => l.tax);
  const beforeRound = taxable + tax;
  const rounded = roundOff ? Math.round(beforeRound / 100) * 100 : beforeRound;

  const byRate = new Map<number, TaxRow>();
  for (const l of lines) {
    const row = byRate.get(l.rateBp) ?? { rateBp: l.rateBp, taxable: 0, cgst: 0, sgst: 0 };
    row.taxable += l.taxable;
    const half = Math.floor(l.tax / 2);
    row.cgst += half;
    row.sgst += l.tax - half;
    byRate.set(l.rateBp, row);
  }

  const mrpSavings = sum((l) => Math.max(0, ((l.mrp ?? l.unitPrice) - l.unitPrice) * l.qty));

  return {
    lines,
    gross,
    lineDiscounts,
    billDiscount: billDisc,
    discountTotal: lineDiscounts + billDisc,
    taxable,
    tax,
    beforeRound,
    roundOff: rounded - beforeRound,
    payable: rounded,
    savings: mrpSavings + lineDiscounts + billDisc,
    taxRows: [...byRate.values()].sort((a, b) => a.rateBp - b.rateBp),
    itemCount: sum((l) => l.qty),
  };
}

/** Resolve a discount typed as "10%" or "150" (rupees) against a base amount. */
export function resolveDiscount(input: string, base: number): number {
  const s = input.trim();
  if (!s) return 0;
  if (s.endsWith("%")) {
    const pct = Number(s.slice(0, -1));
    if (!Number.isFinite(pct) || pct <= 0) return 0;
    return Math.min(base, Math.round((base * Math.min(pct, 100)) / 100));
  }
  const rupees = Number(s.replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(rupees) || rupees <= 0) return 0;
  return Math.min(base, Math.round(rupees * 100));
}

/** Indian financial year label for a date, e.g. 2026-10-06 -> "2026-27". */
export function financialYear(d: Date, timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "numeric" }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function formatInvoiceNumber(prefix: string, fy: string, seq: number) {
  return `${prefix}/${fy}/${String(seq).padStart(5, "0")}`;
}

export const PAYMENT_LABEL = { CASH: "Cash", CARD: "Card", UPI: "UPI", BANK: "Bank transfer", OTHER: "Other" } as const;

/** UPI deep link for a QR code (NPCI spec). Amount in paise. */
export function upiLink(vpa: string, payee: string, amount: number, note: string) {
  const params = new URLSearchParams({ pa: vpa, pn: payee.slice(0, 40), am: (amount / 100).toFixed(2), cu: "INR", tn: note.slice(0, 60) });
  return `upi://pay?${params.toString()}`;
}
