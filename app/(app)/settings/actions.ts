"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { isThemeId, THEME_MODES } from "@/lib/themes";

export type SettingsState = { error?: string; ok?: string } | undefined;

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const storeSchema = z.object({
  name: z.string().trim().min(2, "Enter the shop name").max(80),
  phone: opt(15),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional().transform((v) => v || null),
  address: opt(200),
  city: opt(60),
  state: opt(60),
  pincode: z.union([z.literal(""), z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits")]).optional().transform((v) => v || null),
  gstin: z
    .union([z.literal(""), z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "GSTIN looks incorrect (15 characters)")])
    .optional()
    .transform((v) => v || null),
  upiId: z.union([z.literal(""), z.string().trim().regex(/^[\w.\-]{2,}@[\w]{2,}$/, "UPI ID looks incorrect (e.g. shop@okbank)")]).optional().transform((v) => v || null),
  invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9\-]{1,8}$/, "Invoice prefix: up to 8 letters/numbers"),
});

export async function saveStoreAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requirePermission("settings.manage");
  if (!user.storeId) return { error: "No store linked to your account." };
  const parsed = storeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.store.update({ where: { id: user.storeId, tenantId: user.tenantId }, data: parsed.data });
  await audit(user.tenantId, user.id, "settings.store.update", { entity: "store", entityId: user.storeId });
  revalidatePath("/", "layout");
  return { ok: "Shop details saved." };
}

const appearanceSchema = z.object({ theme: z.string().refine(isThemeId, "Unknown theme"), themeMode: z.enum(THEME_MODES) });

/** Appearance is personal: every user picks their own theme. */
export async function saveAppearanceAction(formData: FormData) {
  const user = await requireUser();
  const parsed = appearanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/", "layout");
}
