import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  try {
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name: b.name?.trim(),
        phone: b.phone?.trim(),
        email: b.email?.trim() || null,
        address: b.address?.trim() || null,
      },
    });
    return NextResponse.json({ ok: true, customer });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Phone already in use." }, { status: 400 });
    return NextResponse.json({ error: "Failed to update customer." }, { status: 500 });
  }
}
