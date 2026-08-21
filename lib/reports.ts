import { query, queryFirst } from "./d1";
import { toSql } from "./queries";

export type ReportRange = { from: Date; to: Date };

export function parseRange(fromStr?: string, toStr?: string): ReportRange {
  const to = toStr ? new Date(toStr) : new Date();
  to.setHours(23, 59, 59, 999);
  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export async function getReport({ from, to }: ReportRange) {
  const f = toSql(from);
  const t = toSql(to);

  const [agg, dailyRows, catRows, prodRows, paymentRows] = await Promise.all([
    queryFirst<{ revenue: number; tax: number; discount: number; subtotal: number; cnt: number }>(
      `SELECT COALESCE(SUM(grandTotal),0) AS revenue, COALESCE(SUM(taxTotal),0) AS tax,
              COALESCE(SUM(discount),0) AS discount, COALESCE(SUM(subtotal),0) AS subtotal, COUNT(*) AS cnt
       FROM Invoice WHERE createdAt >= ? AND createdAt <= ?`,
      [f, t],
    ),
    query<{ d: string; total: number }>(
      `SELECT date(createdAt) AS d, SUM(grandTotal) AS total FROM Invoice WHERE createdAt >= ? AND createdAt <= ? GROUP BY date(createdAt)`,
      [f, t],
    ),
    query<{ name: string; color: string | null; revenue: number; qty: number }>(
      `SELECT COALESCE(c.name,'Uncategorized') AS name, c.color AS color, SUM(ii.lineTotal) AS revenue, SUM(ii.qty) AS qty
       FROM InvoiceItem ii JOIN Invoice i ON i.id = ii.invoiceId
       LEFT JOIN Product p ON p.id = ii.productId
       LEFT JOIN Category c ON c.id = p.categoryId
       WHERE i.createdAt >= ? AND i.createdAt <= ?
       GROUP BY c.name, c.color ORDER BY revenue DESC`,
      [f, t],
    ),
    query<{ name: string; qty: number; revenue: number }>(
      `SELECT ii.name AS name, SUM(ii.qty) AS qty, SUM(ii.lineTotal) AS revenue
       FROM InvoiceItem ii JOIN Invoice i ON i.id = ii.invoiceId
       WHERE i.createdAt >= ? AND i.createdAt <= ?
       GROUP BY ii.name ORDER BY revenue DESC LIMIT 10`,
      [f, t],
    ),
    query<{ mode: string; total: number }>(
      `SELECT paymentMode AS mode, SUM(grandTotal) AS total FROM Invoice WHERE createdAt >= ? AND createdAt <= ? GROUP BY paymentMode`,
      [f, t],
    ),
  ]);

  // Fill daily buckets
  const dailyMap = new Map<string, number>();
  const cursor = new Date(from);
  while (cursor <= to) {
    dailyMap.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const r of dailyRows) if (dailyMap.has(r.d)) dailyMap.set(r.d, r.total);
  const daily = Array.from(dailyMap.entries()).map(([date, total]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    total: Math.round(total),
  }));

  const categories = catRows.map((c) => ({
    name: c.name,
    color: c.color ?? "#a78bfa",
    revenue: Math.round(c.revenue),
    qty: Math.round(c.qty),
  }));

  const topProducts = prodRows.map((p) => ({ name: p.name, qty: Math.round(p.qty), revenue: Math.round(p.revenue) }));
  const payments = paymentRows.map((r) => ({ mode: r.mode, total: Math.round(r.total) })).sort((a, b) => b.total - a.total);

  const revenue = agg?.revenue ?? 0;
  const count = agg?.cnt ?? 0;

  return {
    summary: {
      revenue,
      tax: agg?.tax ?? 0,
      discount: agg?.discount ?? 0,
      invoices: count,
      avgBill: count > 0 ? revenue / count : 0,
    },
    daily,
    categories,
    topProducts,
    payments,
  };
}

/** Rows for CSV export. */
export async function getInvoiceRowsForExport({ from, to }: ReportRange) {
  return query<{
    invoiceNo: string; createdAt: string; customerName: string | null; userName: string;
    paymentMode: string; status: string; subtotal: number; taxTotal: number;
    discount: number; grandTotal: number; paidAmount: number; dueAmount: number;
  }>(
    `SELECT i.invoiceNo, i.createdAt, c.name AS customerName, u.name AS userName,
            i.paymentMode, i.status, i.subtotal, i.taxTotal, i.discount, i.grandTotal, i.paidAmount, i.dueAmount
     FROM Invoice i LEFT JOIN Customer c ON c.id = i.customerId JOIN User u ON u.id = i.userId
     WHERE i.createdAt >= ? AND i.createdAt <= ? ORDER BY i.createdAt ASC`,
    [toSql(from), toSql(to)],
  );
}
