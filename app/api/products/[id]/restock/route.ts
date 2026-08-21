import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const runtime = "edge";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  const qty = Number(b.qty);
  if (!qty || qty === 0) return NextResponse.json({ error: "Enter a valid quantity." }, { status: 400 });

  try {
    // D1 has no interactive transactions; run sequentially.
    const product = await prisma.product.update({ where: { id: params.id }, data: { stock: { increment: qty } } });
    await prisma.stockMovement.create({
      data: {
        productId: params.id,
        qtyChange: qty,
        type: qty > 0 ? "PURCHASE" : "ADJUSTMENT",
        note: b.note || (qty > 0 ? "Restock" : "Stock adjustment"),
      },
    });
    return NextResponse.json({ ok: true, product });
  } catch {
    return NextResponse.json({ error: "Failed to update stock." }, { status: 500 });
  }
}
