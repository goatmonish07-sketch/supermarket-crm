import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute, newId, nowSql } from "@/lib/d1";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  const name = b.name?.trim();
  if (!name) return NextResponse.json({ error: "Supplier name is required." }, { status: 400 });

  const id = newId("sup");
  await execute(
    `INSERT INTO Supplier (id, name, phone, email, address, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, b.phone?.trim() || null, b.email?.trim() || null, b.address?.trim() || null, nowSql()],
  );
  return NextResponse.json({ ok: true, supplier: { id } });
}
