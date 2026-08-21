import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { round2 } from "@/lib/format";
export const runtime = "edge";

/** Collect a dues payment from a customer (reduces their khata balance). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as any;
  const amount = Number(b.amount);
  if (!amount || amount <= 0) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const pay = Math.min(amount, customer.dueBalance);
  const updated = await prisma.customer.update({
    where: { id: params.id },
    data: { dueBalance: round2(customer.dueBalance - pay) },
  });
  return NextResponse.json({ ok: true, collected: round2(pay), dueBalance: updated.dueBalance });
}
