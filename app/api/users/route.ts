import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { execute, newId, nowSql, queryFirst } from "@/lib/d1";
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
  const email = b.email.toLowerCase().trim();
  const dup = await queryFirst<{ id: string }>(`SELECT id FROM User WHERE email = ? LIMIT 1`, [email]);
  if (dup) return NextResponse.json({ error: "Email already registered." }, { status: 400 });

  const role = b.role === "ADMIN" ? "ADMIN" : "CASHIER";
  const id = newId("usr");
  await execute(
    `INSERT INTO User (id, name, email, passwordHash, role, active, createdAt) VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [id, b.name.trim(), email, await hashPassword(b.password), role, nowSql()],
  );
  return NextResponse.json({ ok: true, user: { id } });
}
