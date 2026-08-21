import { prisma } from "./db";

/** Products at or below their low-stock threshold (SQLite-safe column compare). */
export async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { stock: "asc" },
  });
  return products.filter((p) => p.stock <= p.lowStockThreshold);
}

export async function getLowStockCount(): Promise<number> {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { stock: true, lowStockThreshold: true },
  });
  return products.filter((p) => p.stock <= p.lowStockThreshold).length;
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
