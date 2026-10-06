import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "./session";
import { can, type Permission } from "./permissions";

export async function hashSecret(value: string) {
  return bcrypt.hash(value, 10);
}

export async function checkSecret(value: string, hash: string | null | undefined) {
  if (!hash) return false;
  return bcrypt.compare(value, hash);
}

export async function startSession(userId: string, tenantId: string) {
  const token = await signSession({ uid: userId, tid: tenantId });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user with tenant and store, or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findFirst({
    where: { id: session.uid, tenantId: session.tid, active: true },
    include: { tenant: true, store: true },
  });
  if (!user || user.tenant.status === "SUSPENDED" || user.tenant.status === "CANCELLED") return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/dashboard?denied=1");
  return user;
}
