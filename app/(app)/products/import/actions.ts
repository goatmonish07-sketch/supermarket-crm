"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { CatalogueError, itemInput, saveItem } from "@/lib/catalogue-server";
import { readImportFile, type ImportPreview } from "@/lib/import";

const MAX_BYTES = 5 * 1024 * 1024;

export type PreviewState = { error?: string; preview?: ImportPreview } | undefined;
export type CommitState = { error?: string; created?: number; skipped?: { name: string; reason: string }[] } | undefined;

export async function previewImportAction(_prev: PreviewState, formData: FormData): Promise<PreviewState> {
  await requirePermission("products.manage");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a .csv or .xlsx file first." };
  if (file.size > MAX_BYTES) return { error: "File is larger than 5 MB. Split it into smaller files." };
  if (!/\.(csv|xlsx)$/i.test(file.name)) return { error: "Only .csv and .xlsx files are supported. In Excel use File → Save As → CSV or Excel Workbook." };
  try {
    return { preview: await readImportFile(file) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not read that file." };
  }
}

export async function commitImportAction(_prev: CommitState, formData: FormData): Promise<CommitState> {
  const user = await requirePermission("products.manage");
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "[]"));
  } catch {
    return { error: "The preview expired. Please upload the file again." };
  }
  const parsed = z.array(itemInput).max(2000).safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Could not import: ${issue.path.join(" › ")} — ${issue.message}. Please upload the file again.` };
  }
  const items = parsed.data;

  // Skip products whose name already exists so re-running an import doesn't duplicate.
  const existing = await db.item.findMany({
    where: { tenantId: user.tenantId, name: { in: items.map((i) => i.name), mode: "insensitive" } },
    select: { name: true },
  });
  const taken = new Set(existing.map((e) => e.name.toLowerCase()));

  let created = 0;
  const skipped: { name: string; reason: string }[] = [];
  for (const input of items) {
    if (taken.has(input.name.toLowerCase())) {
      skipped.push({ name: input.name, reason: "Already in your catalogue" });
      continue;
    }
    try {
      await db.$transaction((tx) => saveItem(tx, user.tenantId, user.id, input));
      taken.add(input.name.toLowerCase());
      created++;
    } catch (e) {
      if (e instanceof CatalogueError) skipped.push({ name: input.name, reason: e.message });
      else throw e;
    }
  }

  await audit(user.tenantId, user.id, "item.import", { details: { created, skipped: skipped.length } });
  revalidatePath("/products");
  revalidatePath("/inventory");
  return { created, skipped };
}
