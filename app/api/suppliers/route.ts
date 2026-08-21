import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  if (!b.name?.trim()) return NextResponse.json({ error: "Supplier name is required." }, { status: 400 });

  const supplier = await prisma.supplier.create({
    data: { name: b.name.trim(), phone: b.phone?.trim() || null, email: b.email?.trim() || null, address: b.address?.trim() || null },
  });
  return NextResponse.json({ ok: true, supplier });
}
