import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = await req.json().catch(() => ({}));

  // Guard: don't let an admin lock themselves out.
  if (params.id === user.id && (b.active === false || b.role === "CASHIER")) {
    return NextResponse.json({ error: "You cannot demote or deactivate your own account." }, { status: 400 });
  }

  const data: any = {};
  if (b.name !== undefined) data.name = b.name.trim();
  if (b.role !== undefined) data.role = b.role === "ADMIN" ? "ADMIN" : "CASHIER";
  if (b.active !== undefined) data.active = Boolean(b.active);
  if (b.password) {
    if (String(b.password).length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    data.passwordHash = await hashPassword(b.password);
  }

  try {
    await prisma.user.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Email already in use." }, { status: 400 });
    return NextResponse.json({ error: "Failed to update staff." }, { status: 500 });
  }
}
