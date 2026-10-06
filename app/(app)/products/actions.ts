"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { CatalogueError, itemInput, saveItem } from "@/lib/catalogue-server";

export type ProductFormState = { error?: string } | undefined;

export async function saveProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const user = await requirePermission("products.manage");
  const itemId = String(formData.get("id") ?? "") || undefined;

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "Something went wrong reading the form. Please try again." };
  }
  const parsed = itemInput.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const row = issue.path[0] === "variants" && typeof issue.path[1] === "number" ? `Variant ${issue.path[1] + 1}: ` : "";
    return { error: row + issue.message };
  }

  let savedId: string;
  try {
    const item = await db.$transaction((tx) => saveItem(tx, user.tenantId, user.id, parsed.data, itemId));
    savedId = item.id;
  } catch (e) {
    if (e instanceof CatalogueError) return { error: e.message };
    throw e;
  }

  await audit(user.tenantId, user.id, itemId ? "item.update" : "item.create", { entity: "item", entityId: savedId });
  revalidatePath("/products");
  revalidatePath("/inventory");
  redirect(`/products/${savedId}?saved=1`);
}

export async function setProductActiveAction(formData: FormData) {
  const user = await requirePermission("products.manage");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  const { count } = await db.item.updateMany({ where: { id, tenantId: user.tenantId }, data: { active } });
  if (count) await audit(user.tenantId, user.id, active ? "item.restore" : "item.archive", { entity: "item", entityId: id });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}
