import { prisma } from "./db";
import { startOfDay, daysAgo, getLowStockProducts } from "./queries";

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function getDashboardData() {
  const today = startOfDay();
  const yesterday = daysAgo(1);
  const last7 = daysAgo(7);
  const prev7 = daysAgo(14);

  const [
    invoicesToday,
    invoicesYesterday,
    revenueLast7Agg,
    revenuePrev7Agg,
    totalCustomers,
    customersPrev7,
    duesAgg,
    lowStock,
    recentInvoices,
    trendRows,
    paymentRows,
    topProductRows,
  ] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { grandTotal: true }, _count: true, where: { createdAt: { gte: today } } }),
    prisma.invoice.aggregate({ _sum: { grandTotal: true }, where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.invoice.aggregate({ _sum: { grandTotal: true }, _count: true, where: { createdAt: { gte: last7 } } }),
    prisma.invoice.aggregate({ _sum: { grandTotal: true }, where: { createdAt: { gte: prev7, lt: last7 } } }),
    prisma.customer.count(),
    prisma.customer.count({ where: { createdAt: { lt: last7 } } }),
    prisma.invoice.aggregate({ _sum: { dueAmount: true }, where: { dueAmount: { gt: 0 } } }),
    getLowStockProducts(),
    prisma.invoice.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { createdAt: { gte: daysAgo(13) } },
      select: { createdAt: true, grandTotal: true },
    }),
    prisma.invoice.groupBy({
      by: ["paymentMode"],
      _sum: { grandTotal: true },
      where: { createdAt: { gte: last7 } },
    }),
    prisma.invoiceItem.groupBy({
      by: ["productId", "name"],
      _sum: { qty: true, lineTotal: true },
      where: { invoice: { createdAt: { gte: last7 } } },
      orderBy: { _sum: { qty: "desc" } },
      take: 5,
    }),
  ]);

  // ----- Revenue trend (last 14 days, filled) -----
  const trendMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    trendMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of trendRows) {
    const key = startOfDay(row.createdAt).toISOString().slice(0, 10);
    trendMap.set(key, (trendMap.get(key) ?? 0) + row.grandTotal);
  }
  const revenueTrend = Array.from(trendMap.entries()).map(([date, total]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    total: Math.round(total),
  }));

  // ----- Payment split -----
  const paymentSplit = paymentRows
    .map((r) => ({ mode: r.paymentMode, total: Math.round(r._sum.grandTotal ?? 0) }))
    .sort((a, b) => b.total - a.total);

  const topProducts = topProductRows.map((r) => ({
    productId: r.productId,
    name: r.name,
    qty: Math.round(r._sum.qty ?? 0),
    revenue: Math.round(r._sum.lineTotal ?? 0),
  }));

  const todaySales = invoicesToday._sum.grandTotal ?? 0;
  const ydaySales = invoicesYesterday._sum.grandTotal ?? 0;
  const revenue7 = revenueLast7Agg._sum.grandTotal ?? 0;
  const revenuePrev = revenuePrev7Agg._sum.grandTotal ?? 0;
  const dues = duesAgg._sum.dueAmount ?? 0;

  return {
    kpis: {
      todaySales,
      todaySalesDelta: pctChange(todaySales, ydaySales),
      todayInvoiceCount: invoicesToday._count,
      revenue7,
      revenueDelta: pctChange(revenue7, revenuePrev),
      totalCustomers,
      customersDelta: pctChange(totalCustomers, customersPrev7),
      dues,
      lowStockCount: lowStock.length,
    },
    revenueTrend,
    paymentSplit,
    topProducts,
    lowStock: lowStock.slice(0, 5),
    recentInvoices,
  };
}
