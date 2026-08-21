import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { execute } from "@/lib/d1";
export const runtime = "edge";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;

  // Guard: don't let an admin lock themselves out.
  if (params.id === user.id && (b.active === false || b.role === "CASHIER")) {
    return NextResponse.json({ error: "You cannot demote or deactivate your own account." }, { status: 400 });
  }

  const sets: string[] = [];
  const vals: any[] = [];
  const set = (c: string, v: any) => { sets.push(`${c} = ?`); vals.push(v); };
  if (b.name !== undefined) set("name", b.name.trim());
  if (b.role !== undefined) set("role", b.role === "ADMIN" ? "ADMIN" : "CASHIER");
  if (b.active !== undefined) set("active", b.active ? 1 : 0);
  if (b.password) {
    if (String(b.password).length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    set("passwordHash", await hashPassword(b.password));
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });

  await execute(`UPDATE User SET ${sets.join(", ")} WHERE id = ?`, [...vals, params.id]);
  return NextResponse.json({ ok: true });
}
