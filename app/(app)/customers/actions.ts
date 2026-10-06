"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";

export type CustomerFormState = { error?: string; ok?: string } | undefined;

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter the customer's name").max(80),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a 10-digit mobile number"),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email")]).optional(),
  birthday: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function saveCustomerAction(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const user = await requirePermission("customers.manage");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...d } = parsed.data;
  const data = { name: d.name, phone: d.phone, email: d.email || null, birthday: d.birthday ? new Date(`${d.birthday}T00:00:00Z`) : null, notes: d.notes || null };

  let savedId = id;
  try {
    if (id) {
      const { count } = await db.customer.updateMany({ where: { id, tenantId: user.tenantId }, data });
      if (!count) return { error: "Customer not found." };
    } else {
      savedId = (await db.customer.create({ data: { ...data, tenantId: user.tenantId } })).id;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Another customer already has this mobile number." };
    throw e;
  }
  await audit(user.tenantId, user.id, id ? "customer.update" : "customer.create", { entity: "customer", entityId: savedId });
  revalidatePath("/customers");
  if (!id) redirect(`/customers/${savedId}`);
  revalidatePath(`/customers/${id}`);
  return { ok: "Saved." };
}
