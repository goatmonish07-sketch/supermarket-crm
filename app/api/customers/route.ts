import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute, newId, nowSql, queryFirst } from "@/lib/d1";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as any;
  const name = b.name?.trim();
  const phone = b.phone?.trim();
  if (!name || !phone) return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });

  const dup = await queryFirst<{ id: string }>(`SELECT id FROM Customer WHERE phone = ? LIMIT 1`, [phone]);
  if (dup) return NextResponse.json({ error: "A customer with this phone already exists." }, { status: 400 });

  const id = newId("cust");
  try {
    await execute(
      `INSERT INTO Customer (id, name, phone, email, address, loyaltyPoints, dueBalance, createdAt) VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [id, name, phone, b.email?.trim() || null, b.address?.trim() || null, nowSql()],
    );
    return NextResponse.json({ ok: true, customer: { id } });
  } catch {
    return NextResponse.json({ error: "Failed to create customer." }, { status: 500 });
  }
}
