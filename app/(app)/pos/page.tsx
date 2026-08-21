import { query } from "@/lib/d1";
import { getSettings } from "@/lib/settings";
import PosClient from "./PosClient";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const [products, categories, customers, settings] = await Promise.all([
    query<{ id: string; name: string; sku: string; sellPrice: number; taxRate: number; stock: number; unit: string; categoryId: string | null; image: string | null }>(
      `SELECT id, name, sku, sellPrice, taxRate, stock, unit, categoryId, image FROM Product WHERE active = 1 ORDER BY name ASC`,
    ),
    query<{ id: string; name: string; color: string }>(`SELECT id, name, color FROM Category ORDER BY name ASC`),
    query<{ id: string; name: string; phone: string }>(`SELECT id, name, phone FROM Customer ORDER BY name ASC`),
    getSettings(),
  ]);

  return <PosClient products={products} categories={categories} customers={customers} loyaltyRate={settings.loyaltyRate} />;
}
