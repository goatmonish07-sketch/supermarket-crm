import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  if (!b.name?.trim() || !b.phone?.trim()) {
    return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  }
  try {
    const customer = await prisma.customer.create({
      data: {
        name: b.name.trim(),
        phone: b.phone.trim(),
        email: b.email?.trim() || null,
        address: b.address?.trim() || null,
      },
    });
    return NextResponse.json({ ok: true, customer });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "A customer with this phone already exists." }, { status: 400 });
    return NextResponse.json({ error: "Failed to create customer." }, { status: 500 });
  }
}
