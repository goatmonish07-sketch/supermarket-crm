import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "smcrm_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me",
);

// Routes only ADMINs may open.
const ADMIN_ONLY = ["/staff", "/settings"];

const PUBLIC_PATHS = ["/login"];

async function readRole(req: NextRequest): Promise<"ADMIN" | "CASHIER" | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.role as "ADMIN" | "CASHIER") ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await readRole(req);
  const isAuthed = role !== null;

  // Redirect authed users away from /login
  if (isAuthed && PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Unauthenticated -> login
  if (!isAuthed) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Admin-only route guard
  if (role !== "ADMIN" && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect page routes only. API routes do their own auth (getSession + role
  // checks) and must not be redirected to /login, so exclude all of /api.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
