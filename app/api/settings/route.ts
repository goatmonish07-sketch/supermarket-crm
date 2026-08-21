import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute } from "@/lib/d1";
export const runtime = "edge";

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as any;
  const shopName = b.shopName?.trim() || "SuperMart";
  const tagline = b.tagline?.trim() || "";
  const address = b.address?.trim() || "";
  const phone = b.phone?.trim() || "";
  const gstin = b.gstin?.trim() || "";
  const loyaltyRate = Math.max(1, Number(b.loyaltyRate) || 100);

  await execute(
    `INSERT INTO Setting (id, shopName, tagline, address, phone, gstin, currency, loyaltyRate)
     VALUES (1, ?, ?, ?, ?, ?, 'INR', ?)
     ON CONFLICT(id) DO UPDATE SET shopName = excluded.shopName, tagline = excluded.tagline,
       address = excluded.address, phone = excluded.phone, gstin = excluded.gstin, loyaltyRate = excluded.loyaltyRate`,
    [shopName, tagline, address, phone, gstin, loyaltyRate],
  );
  return NextResponse.json({ ok: true });
}
