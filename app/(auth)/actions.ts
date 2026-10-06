"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { checkSecret, endSession, getCurrentUser, hashSecret, startSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const TRIAL_DAYS = 14;

const signupSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your boutique's name").max(80),
  ownerName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(/^[0-9+\- ]{7,15}$/, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
});

async function uniqueSlug(base: string) {
  const root = slugify(base) || "shop";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await db.tenant.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    // Echo back non-secret fields so the form keeps what was typed.
    const fields = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "password" && key !== "pin"));
    return { error: parsed.error.issues[0].message, fields };
  }
  const data = parsed.data;
  const slug = await uniqueSlug(data.businessName);
  const [passwordHash, pinHash] = await Promise.all([hashSecret(data.password), hashSecret(data.pin)]);

  const owner = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: data.businessName, slug, trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000) },
    });
    const store = await tx.store.create({
      data: { tenantId: tenant.id, name: data.businessName, phone: data.phone, email: data.email },
    });
    return tx.user.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        name: data.ownerName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        pinHash,
        role: "OWNER",
      },
    });
  });

  await audit(owner.tenantId, owner.id, "tenant.signup", { details: { slug } });
  await startSession(owner.id, owner.tenantId);
  redirect("/dashboard?welcome=1");
}

const loginSchema = z.object({
  shop: z.string().trim().toLowerCase().min(1, "Enter your shop ID"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = loginSchema.safeParse(raw);
  const fields = { shop: raw.shop ?? "", email: raw.email ?? "" };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const { shop, email, password, next } = parsed.data;

  const user = await db.user.findFirst({
    where: { email, active: true, tenant: { slug: shop } },
    include: { tenant: { select: { status: true } } },
  });
  // Same message for unknown shop, unknown user and wrong password.
  if (!user || !(await checkSecret(password, user.passwordHash))) {
    return { error: "Shop ID, email or password is incorrect", fields };
  }
  if (user.tenant.status === "SUSPENDED" || user.tenant.status === "CANCELLED") {
    return { error: "This shop's account is not active. Please contact AuraPOS support.", fields };
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.tenantId, user.id, "auth.login");
  await startSession(user.id, user.tenantId);
  redirect(safeNext(next));
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user.tenantId, user.id, "auth.logout");
  await endSession();
  redirect("/login");
}

const pinSchema = z.object({ userId: z.string().min(1), pin: z.string().regex(/^\d{4,6}$/, "Enter the 4–6 digit PIN") });

/** Switch the signed-in staff member on this device (same shop only). */
export async function pinSwitchAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const parsed = pinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const target = await db.user.findFirst({ where: { id: parsed.data.userId, tenantId: current.tenantId, active: true } });
  if (!target || !(await checkSecret(parsed.data.pin, target.pinHash))) {
    await audit(current.tenantId, current.id, "auth.pin_failed", { entity: "user", entityId: parsed.data.userId });
    return { error: "Wrong PIN" };
  }

  await db.user.update({ where: { id: target.id }, data: { lastLoginAt: new Date() } });
  await audit(target.tenantId, target.id, "auth.pin_switch", { details: { from: current.id } });
  await startSession(target.id, target.tenantId);
  redirect("/dashboard");
}
