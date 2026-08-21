import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute, newId, nowSql, queryFirst } from "@/lib/d1";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  const name = b.name?.trim();
  if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

  const dup = await queryFirst<{ id: string }>(`SELECT id FROM Category WHERE name = ? LIMIT 1`, [name]);
  if (dup) return NextResponse.json({ error: "Category already exists." }, { status: 400 });

  const id = newId("cat");
  try {
    await execute(`INSERT INTO Category (id, name, color, createdAt) VALUES (?, ?, ?, ?)`, [id, name, b.color || "#7c5cfc", nowSql()]);
    return NextResponse.json({ ok: true, category: { id } });
  } catch {
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}
