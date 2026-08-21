import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const runtime = "edge";

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  const data = {
    shopName: b.shopName?.trim() || "SuperMart",
    tagline: b.tagline?.trim() || "",
    address: b.address?.trim() || "",
    phone: b.phone?.trim() || "",
    gstin: b.gstin?.trim() || "",
    loyaltyRate: Math.max(1, Number(b.loyaltyRate) || 100),
  };

  const settings = await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true, settings });
}
