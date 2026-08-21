import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const qty = Number(b.qty);
  if (!qty || qty === 0) return NextResponse.json({ error: "Enter a valid quantity." }, { status: 400 });

  try {
    const [product] = await prisma.$transaction([
      prisma.product.update({ where: { id: params.id }, data: { stock: { increment: qty } } }),
      prisma.stockMovement.create({
        data: {
          productId: params.id,
          qtyChange: qty,
          type: qty > 0 ? "PURCHASE" : "ADJUSTMENT",
          note: b.note || (qty > 0 ? "Restock" : "Stock adjustment"),
        },
      }),
    ]);
    return NextResponse.json({ ok: true, product });
  } catch {
    return NextResponse.json({ error: "Failed to update stock." }, { status: 500 });
  }
}
