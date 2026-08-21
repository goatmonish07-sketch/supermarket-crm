import { query } from "@/lib/d1";
import { getSession } from "@/lib/auth";
import ProductsClient from "./ProductsClient";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const [products, categories, user] = await Promise.all([
    query<{
      id: string; name: string; sku: string; categoryId: string | null; categoryName: string | null; categoryColor: string | null;
      costPrice: number; sellPrice: number; taxRate: number; stock: number; unit: string; lowStockThreshold: number; image: string | null;
    }>(
      `SELECT p.id, p.name, p.sku, p.categoryId, c.name AS categoryName, c.color AS categoryColor,
              p.costPrice, p.sellPrice, p.taxRate, p.stock, p.unit, p.lowStockThreshold, p.image
       FROM Product p LEFT JOIN Category c ON c.id = p.categoryId
       WHERE p.active = 1 ORDER BY p.name ASC`,
    ),
    query<{ id: string; name: string; color: string }>(`SELECT id, name, color FROM Category ORDER BY name ASC`),
    getSession(),
  ]);

  return (
    <ProductsClient
      products={products.map((p) => ({
        id: p.id, name: p.name, sku: p.sku, categoryId: p.categoryId,
        categoryName: p.categoryName, categoryColor: p.categoryColor ?? "#7c5cfc",
        costPrice: p.costPrice, sellPrice: p.sellPrice, taxRate: p.taxRate,
        stock: p.stock, unit: p.unit, lowStockThreshold: p.lowStockThreshold, image: p.image,
      }))}
      categories={categories}
      isAdmin={user?.role === "ADMIN"}
      initialFilter={searchParams.filter === "low" ? "low" : "all"}
    />
  );
}
