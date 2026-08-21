import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute, newId, nowSql, queryFirst } from "@/lib/d1";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  if (!b.name || !b.sku) return NextResponse.json({ error: "Name and SKU are required." }, { status: 400 });

  const sku = String(b.sku).trim();
  const dup = await queryFirst<{ id: string }>(`SELECT id FROM Product WHERE sku = ? LIMIT 1`, [sku]);
  if (dup) return NextResponse.json({ error: "A product with this SKU already exists." }, { status: 400 });

  const id = newId("prod");
  const now = nowSql();
  const stock = Number(b.stock) || 0;
  try {
    await execute(
      `INSERT INTO Product (id, name, sku, categoryId, costPrice, sellPrice, taxRate, stock, unit, lowStockThreshold, image, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, String(b.name).trim(), sku, b.categoryId || null, Number(b.costPrice) || 0, Number(b.sellPrice) || 0,
       Number(b.taxRate) || 0, stock, b.unit || "pcs", Number(b.lowStockThreshold) || 10, b.image?.trim() || null, now, now],
    );
    if (stock > 0) {
      await execute(`INSERT INTO StockMovement (id, productId, qtyChange, type, note, createdAt) VALUES (?, ?, ?, 'PURCHASE', 'Initial stock', ?)`,
        [newId("mov"), id, stock, now]);
    }
    return NextResponse.json({ ok: true, product: { id } });
  } catch {
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
