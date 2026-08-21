import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  if (!b.name?.trim()) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

  try {
    const category = await prisma.category.create({
      data: { name: b.name.trim(), color: b.color || "#7c5cfc" },
    });
    return NextResponse.json({ ok: true, category });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Category already exists." }, { status: 400 });
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}
