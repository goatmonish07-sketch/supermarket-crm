import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  if (!b.name?.trim() || !b.email?.trim() || !b.password) {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
  }
  if (String(b.password).length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  const role = b.role === "ADMIN" ? "ADMIN" : "CASHIER";

  try {
    const created = await prisma.user.create({
      data: {
        name: b.name.trim(),
        email: b.email.toLowerCase().trim(),
        passwordHash: await hashPassword(b.password),
        role,
      },
    });
    return NextResponse.json({ ok: true, user: { id: created.id } });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Email already registered." }, { status: 400 });
    return NextResponse.json({ error: "Failed to create staff." }, { status: 500 });
  }
}
