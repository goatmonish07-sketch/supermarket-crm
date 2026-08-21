import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute, queryFirst } from "@/lib/d1";
export const runtime = "edge";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as any;
  const phone = b.phone?.trim();
  if (phone) {
    const dup = await queryFirst<{ id: string }>(`SELECT id FROM Customer WHERE phone = ? AND id != ? LIMIT 1`, [phone, params.id]);
    if (dup) return NextResponse.json({ error: "Phone already in use." }, { status: 400 });
  }
  try {
    await execute(
      `UPDATE Customer SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?`,
      [b.name?.trim(), phone, b.email?.trim() || null, b.address?.trim() || null, params.id],
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update customer." }, { status: 500 });
  }
}
