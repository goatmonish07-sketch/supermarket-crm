import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json().catch(() => ({}))) as any;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  await createSession(user);
  return NextResponse.json({ ok: true, user });
}
