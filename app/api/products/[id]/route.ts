import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute, queryFirst, nowSql } from "@/lib/d1";
export const runtime = "edge";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;

  if (b.sku) {
    const dup = await queryFirst<{ id: string }>(`SELECT id FROM Product WHERE sku = ? AND id != ? LIMIT 1`, [String(b.sku).trim(), params.id]);
    if (dup) return NextResponse.json({ error: "SKU already in use." }, { status: 400 });
  }

  const sets: string[] = [];
  const vals: any[] = [];
  const set = (col: string, val: any) => { sets.push(`${col} = ?`); vals.push(val); };
  if (b.name !== undefined) set("name", String(b.name).trim());
  if (b.sku !== undefined) set("sku", String(b.sku).trim());
  set("categoryId", b.categoryId || null);
  if (b.costPrice !== undefined) set("costPrice", Number(b.costPrice));
  if (b.sellPrice !== undefined) set("sellPrice", Number(b.sellPrice));
  if (b.taxRate !== undefined) set("taxRate", Number(b.taxRate));
  if (b.unit !== undefined) set("unit", b.unit);
  if (b.lowStockThreshold !== undefined) set("lowStockThreshold", Number(b.lowStockThreshold));
  if (b.image !== undefined) set("image", b.image?.trim() || null);
  if (b.active !== undefined) set("active", b.active ? 1 : 0);
  set("updatedAt", nowSql());

  try {
    await execute(`UPDATE Product SET ${sets.join(", ")} WHERE id = ?`, [...vals, params.id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  try {
    await execute(`UPDATE Product SET active = 0 WHERE id = ?`, [params.id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product." }, { status: 500 });
  }
}
