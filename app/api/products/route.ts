import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  if (!b.name || !b.sku) return NextResponse.json({ error: "Name and SKU are required." }, { status: 400 });

  try {
    const product = await prisma.product.create({
      data: {
        name: String(b.name).trim(),
        sku: String(b.sku).trim(),
        categoryId: b.categoryId || null,
        costPrice: Number(b.costPrice) || 0,
        sellPrice: Number(b.sellPrice) || 0,
        taxRate: Number(b.taxRate) || 0,
        stock: Number(b.stock) || 0,
        unit: b.unit || "pcs",
        lowStockThreshold: Number(b.lowStockThreshold) || 10,
      },
    });
    if (Number(b.stock) > 0) {
      await prisma.stockMovement.create({
        data: { productId: product.id, qtyChange: Number(b.stock), type: "PURCHASE", note: "Initial stock" },
      });
    }
    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "A product with this SKU already exists." }, { status: 400 });
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
