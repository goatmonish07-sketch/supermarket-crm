import { SignJWT, jwtVerify } from "jose";

// Edge-safe: used by middleware.ts as well as server code.

export const SESSION_COOKIE = "aura_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // one shop day

export type SessionPayload = {
  uid: string; // signed-in user
  tid: string; // tenant
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value === "change-me") throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "string" || typeof payload.tid !== "string") return null;
    return { uid: payload.uid, tid: payload.tid };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
