import { query } from "./d1";

export type ProductRow = {
  id: string; name: string; sku: string; categoryId: string | null;
  costPrice: number; sellPrice: number; taxRate: number;
  stock: number; unit: string; lowStockThreshold: number;
  categoryName: string | null; categoryColor: string | null;
};

/** Products at or below their low-stock threshold. */
export async function getLowStockProducts(): Promise<ProductRow[]> {
  return query<ProductRow>(
    `SELECT p.*, c.name AS categoryName, c.color AS categoryColor
     FROM Product p LEFT JOIN Category c ON c.id = p.categoryId
     WHERE p.active = 1 AND p.stock <= p.lowStockThreshold
     ORDER BY p.stock ASC`,
  );
}

export async function getLowStockCount(): Promise<number> {
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM Product WHERE active = 1 AND stock <= lowStockThreshold`,
  );
  return rows[0]?.n ?? 0;
}

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysAgo(n: number): Date {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

/** Format a JS Date as the SQLite/D1 datetime string used by our rows. */
export function toSql(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}
