import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute } from "@/lib/d1";
export const runtime = "edge";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  await execute(
    `UPDATE Supplier SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?`,
    [b.name?.trim(), b.phone?.trim() || null, b.email?.trim() || null, b.address?.trim() || null, params.id],
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await execute(`DELETE FROM Supplier WHERE id = ?`, [params.id]);
  return NextResponse.json({ ok: true });
}
