"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashSecret, requirePermission } from "@/lib/auth";
import { assignableRoles } from "@/lib/permissions";

export type TeamFormState = { error?: string; ok?: string } | undefined;

const staffSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff member's name").max(80),
  phone: z.string().trim().max(15).optional(),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email")]).optional(),
  role: z.enum(["OWNER", "MANAGER", "CASHIER", "STOCK", "TAILOR", "ACCOUNTANT"]),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
  password: z.union([z.literal(""), z.string().min(8, "Password must be at least 8 characters")]).optional(),
});

export async function addStaffAction(_prev: TeamFormState, formData: FormData): Promise<TeamFormState> {
  const actor = await requirePermission("team.manage");
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  if (!assignableRoles(actor.role).includes(data.role as Role)) return { error: "You can't assign that role." };
  if (data.password && !data.email) return { error: "Add an email so this person can log in with a password." };
  if (data.email && (await db.user.findFirst({ where: { tenantId: actor.tenantId, email: data.email }, select: { id: true } }))) {
    return { error: "Someone in your shop already uses that email." };
  }

  const user = await db.user.create({
    data: {
      tenantId: actor.tenantId,
      storeId: actor.storeId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      role: data.role,
      pinHash: await hashSecret(data.pin),
      passwordHash: data.password ? await hashSecret(data.password) : null,
    },
  });
  await audit(actor.tenantId, actor.id, "user.create", { entity: "user", entityId: user.id, details: { role: user.role } });
  revalidatePath("/team");
  return { ok: `${user.name} added. They can now unlock the counter with their PIN.` };
}

export async function toggleStaffAction(formData: FormData) {
  const actor = await requirePermission("team.manage");
  const id = String(formData.get("id") ?? "");
  const target = await db.user.findFirst({ where: { id, tenantId: actor.tenantId } });
  // Never lock yourself out, and only owners may change owners.
  if (!target || target.id === actor.id || (target.role === "OWNER" && actor.role !== "OWNER")) return;

  await db.user.update({ where: { id: target.id }, data: { active: !target.active } });
  await audit(actor.tenantId, actor.id, target.active ? "user.deactivate" : "user.activate", { entity: "user", entityId: target.id });
  revalidatePath("/team");
}
