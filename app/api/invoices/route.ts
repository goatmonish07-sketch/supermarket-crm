import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createInvoice } from "@/lib/invoice";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as any;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const result = await createInvoice(user.id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result);
}
