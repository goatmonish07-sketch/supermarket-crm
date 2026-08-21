import { prisma } from "./db";

export type ReportRange = { from: Date; to: Date };

export function parseRange(fromStr?: string, toStr?: string): ReportRange {
  const to = toStr ? new Date(toStr) : new Date();
  to.setHours(23, 59, 59, 999);
  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export async function getReport({ from, to }: ReportRange) {
  const where = { createdAt: { gte: from, lte: to } };

  const [agg, invoices, itemRows, paymentRows] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { grandTotal: true, taxTotal: true, discount: true, subtotal: true },
      _count: true,
      where,
    }),
    prisma.invoice.findMany({ where, select: { createdAt: true, grandTotal: true } }),
    prisma.invoiceItem.findMany({
      where: { invoice: where },
      select: { name: true, qty: true, lineTotal: true, product: { select: { category: { select: { name: true, color: true } } } } },
    }),
    prisma.invoice.groupBy({ by: ["paymentMode"], _sum: { grandTotal: true }, where }),
  ]);

  // Daily sales
  const dailyMap = new Map<string, number>();
  const cursor = new Date(from);
  while (cursor <= to) {
    dailyMap.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const inv of invoices) {
    const key = inv.createdAt.toISOString().slice(0, 10);
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + inv.grandTotal);
  }
  const daily = Array.from(dailyMap.entries()).map(([date, total]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    total: Math.round(total),
  }));

  // Category breakdown
  const catMap = new Map<string, { name: string; color: string; revenue: number; qty: number }>();
  for (const it of itemRows) {
    const name = it.product?.category?.name ?? "Uncategorized";
    const color = it.product?.category?.color ?? "#a78bfa";
    const cur = catMap.get(name) ?? { name, color, revenue: 0, qty: 0 };
    cur.revenue += it.lineTotal;
    cur.qty += it.qty;
    catMap.set(name, cur);
  }
  const categories = Array.from(catMap.values()).map((c) => ({ ...c, revenue: Math.round(c.revenue) })).sort((a, b) => b.revenue - a.revenue);

  // Top products
  const prodMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const it of itemRows) {
    const cur = prodMap.get(it.name) ?? { name: it.name, qty: 0, revenue: 0 };
    cur.qty += it.qty;
    cur.revenue += it.lineTotal;
    prodMap.set(it.name, cur);
  }
  const topProducts = Array.from(prodMap.values())
    .map((p) => ({ ...p, revenue: Math.round(p.revenue), qty: Math.round(p.qty) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const payments = paymentRows.map((r) => ({ mode: r.paymentMode, total: Math.round(r._sum.grandTotal ?? 0) })).sort((a, b) => b.total - a.total);

  const revenue = agg._sum.grandTotal ?? 0;
  const count = agg._count;

  return {
    summary: {
      revenue,
      tax: agg._sum.taxTotal ?? 0,
      discount: agg._sum.discount ?? 0,
      invoices: count,
      avgBill: count > 0 ? revenue / count : 0,
    },
    daily,
    categories,
    topProducts,
    payments,
  };
}
