import { query, queryFirst } from "./d1";
import { startOfDay, daysAgo, toSql, getLowStockProducts } from "./queries";

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function getDashboardData() {
  const today = toSql(startOfDay());
  const yesterday = toSql(daysAgo(1));
  const last7 = toSql(daysAgo(7));
  const prev7 = toSql(daysAgo(14));
  const trendStart = toSql(daysAgo(13));

  const [
    todayAgg, ydayAgg, rev7Agg, revPrevAgg, custAgg, custPrevAgg, duesAgg,
    lowStock, recentInvoices, trendRows, paymentRows, topRows,
  ] = await Promise.all([
    queryFirst<{ total: number; cnt: number }>(`SELECT COALESCE(SUM(grandTotal),0) AS total, COUNT(*) AS cnt FROM Invoice WHERE createdAt >= ?`, [today]),
    queryFirst<{ total: number }>(`SELECT COALESCE(SUM(grandTotal),0) AS total FROM Invoice WHERE createdAt >= ? AND createdAt < ?`, [yesterday, today]),
    queryFirst<{ total: number }>(`SELECT COALESCE(SUM(grandTotal),0) AS total FROM Invoice WHERE createdAt >= ?`, [last7]),
    queryFirst<{ total: number }>(`SELECT COALESCE(SUM(grandTotal),0) AS total FROM Invoice WHERE createdAt >= ? AND createdAt < ?`, [prev7, last7]),
    queryFirst<{ n: number }>(`SELECT COUNT(*) AS n FROM Customer`),
    queryFirst<{ n: number }>(`SELECT COUNT(*) AS n FROM Customer WHERE createdAt < ?`, [last7]),
    queryFirst<{ total: number }>(`SELECT COALESCE(SUM(dueAmount),0) AS total FROM Invoice WHERE dueAmount > 0`),
    getLowStockProducts(),
    query<{ id: string; invoiceNo: string; grandTotal: number; status: string; customerName: string | null }>(
      `SELECT i.id, i.invoiceNo, i.grandTotal, i.status, c.name AS customerName
       FROM Invoice i LEFT JOIN Customer c ON c.id = i.customerId
       ORDER BY i.createdAt DESC LIMIT 6`,
    ),
    query<{ d: string; total: number }>(
      `SELECT date(createdAt) AS d, SUM(grandTotal) AS total FROM Invoice WHERE createdAt >= ? GROUP BY date(createdAt)`,
      [trendStart],
    ),
    query<{ mode: string; total: number }>(
      `SELECT paymentMode AS mode, SUM(grandTotal) AS total FROM Invoice WHERE createdAt >= ? GROUP BY paymentMode`,
      [last7],
    ),
    query<{ productId: string; name: string; qty: number; revenue: number }>(
      `SELECT ii.productId AS productId, ii.name AS name, SUM(ii.qty) AS qty, SUM(ii.lineTotal) AS revenue
       FROM InvoiceItem ii JOIN Invoice i ON i.id = ii.invoiceId
       WHERE i.createdAt >= ? GROUP BY ii.productId, ii.name ORDER BY qty DESC LIMIT 5`,
      [last7],
    ),
  ]);

  // Revenue trend, filled for 14 days
  const trendMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) trendMap.set(daysAgo(i).toISOString().slice(0, 10), 0);
  for (const r of trendRows) if (trendMap.has(r.d)) trendMap.set(r.d, r.total);
  const revenueTrend = Array.from(trendMap.entries()).map(([date, total]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    total: Math.round(total),
  }));

  const paymentSplit = paymentRows
    .map((r) => ({ mode: r.mode, total: Math.round(r.total) }))
    .sort((a, b) => b.total - a.total);

  const topProducts = topRows.map((r) => ({
    productId: r.productId,
    name: r.name,
    qty: Math.round(r.qty),
    revenue: Math.round(r.revenue),
  }));

  const todaySales = todayAgg?.total ?? 0;
  const ydaySales = ydayAgg?.total ?? 0;
  const revenue7 = rev7Agg?.total ?? 0;
  const revenuePrev = revPrevAgg?.total ?? 0;

  return {
    kpis: {
      todaySales,
      todaySalesDelta: pctChange(todaySales, ydaySales),
      todayInvoiceCount: todayAgg?.cnt ?? 0,
      revenue7,
      revenueDelta: pctChange(revenue7, revenuePrev),
      totalCustomers: custAgg?.n ?? 0,
      customersDelta: pctChange(custAgg?.n ?? 0, custPrevAgg?.n ?? 0),
      dues: duesAgg?.total ?? 0,
      lowStockCount: lowStock.length,
    },
    revenueTrend,
    paymentSplit,
    topProducts,
    lowStock: lowStock.slice(0, 5),
    recentInvoices: recentInvoices.map((i) => ({
      id: i.id,
      invoiceNo: i.invoiceNo,
      grandTotal: i.grandTotal,
      status: i.status,
      customer: i.customerName ? { name: i.customerName } : null,
    })),
  };
}
