import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const AUTH_PAGES = ["/login", "/signup"];

// Cheap gate: a valid signed cookie is required for app pages. Pages still
// load the user from the database (lib/auth.ts) to check active/tenant status.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (AUTH_PAGES.includes(pathname)) {
    return session ? NextResponse.redirect(new URL("/dashboard", req.url)) : NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", req.url);
    if (pathname !== "/dashboard") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/lock",
    "/dashboard/:path*",
    "/billing/:path*",
    "/orders/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/customers/:path*",
    "/reports/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/help/:path*",
  ],
};
