import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
export const runtime = "edge";

export async function POST() {
  destroySession();
  return NextResponse.json({ ok: true });
}
