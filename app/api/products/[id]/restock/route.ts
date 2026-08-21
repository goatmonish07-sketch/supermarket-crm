import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute, newId, nowSql } from "@/lib/d1";
export const runtime = "edge";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  const qty = Number(b.qty);
  if (!qty || qty === 0) return NextResponse.json({ error: "Enter a valid quantity." }, { status: 400 });

  try {
    await execute(`UPDATE Product SET stock = stock + ?, updatedAt = ? WHERE id = ?`, [qty, nowSql(), params.id]);
    await execute(
      `INSERT INTO StockMovement (id, productId, qtyChange, type, note, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [newId("mov"), params.id, qty, qty > 0 ? "PURCHASE" : "ADJUSTMENT", b.note || (qty > 0 ? "Restock" : "Stock adjustment"), nowSql()],
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update stock." }, { status: 500 });
  }
}
