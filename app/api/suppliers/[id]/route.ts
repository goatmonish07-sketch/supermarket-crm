import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const runtime = "edge";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: { name: b.name?.trim(), phone: b.phone?.trim() || null, email: b.email?.trim() || null, address: b.address?.trim() || null },
  });
  return NextResponse.json({ ok: true, supplier });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  await prisma.supplier.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
