import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import PosClient from "./PosClient";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const [products, categories, customers, settings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, sellPrice: true, taxRate: true, stock: true, unit: true, categoryId: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    getSettings(),
  ]);

  return (
    <PosClient
      products={products}
      categories={categories}
      customers={customers}
      loyaltyRate={settings.loyaltyRate}
    />
  );
}
