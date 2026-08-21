import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import ProductsClient from "./ProductsClient";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const [products, categories, user] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    getSession(),
  ]);

  return (
    <ProductsClient
      products={products.map((p) => ({
        id: p.id, name: p.name, sku: p.sku, categoryId: p.categoryId,
        categoryName: p.category?.name ?? null, categoryColor: p.category?.color ?? "#7c5cfc",
        costPrice: p.costPrice, sellPrice: p.sellPrice, taxRate: p.taxRate,
        stock: p.stock, unit: p.unit, lowStockThreshold: p.lowStockThreshold,
      }))}
      categories={categories}
      isAdmin={user?.role === "ADMIN"}
      initialFilter={searchParams.filter === "low" ? "low" : "all"}
    />
  );
}
