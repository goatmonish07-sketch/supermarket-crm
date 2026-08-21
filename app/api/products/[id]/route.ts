import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const runtime = "edge";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  try {
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: b.name?.trim(),
        sku: b.sku?.trim(),
        categoryId: b.categoryId || null,
        costPrice: b.costPrice !== undefined ? Number(b.costPrice) : undefined,
        sellPrice: b.sellPrice !== undefined ? Number(b.sellPrice) : undefined,
        taxRate: b.taxRate !== undefined ? Number(b.taxRate) : undefined,
        unit: b.unit,
        lowStockThreshold: b.lowStockThreshold !== undefined ? Number(b.lowStockThreshold) : undefined,
        active: b.active,
      },
    });
    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "SKU already in use." }, { status: 400 });
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    // Soft-delete to preserve invoice history.
    await prisma.product.update({ where: { id: params.id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product." }, { status: 500 });
  }
}
