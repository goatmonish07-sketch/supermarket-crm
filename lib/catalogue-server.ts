import "server-only";
import type { ItemType, Prisma } from "@prisma/client";
import { z } from "zod";
import { inStoreBarcode, isValidEan13, makeSku, parseRupees, tracksStock } from "./catalogue";

type Tx = Prisma.TransactionClient;

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const money = (label: string, required: boolean) =>
  z.unknown().optional().transform((v, ctx) => {
    const paise = parseRupees(v);
    if (paise === null) {
      if (!required && (v === "" || v === null || v === undefined)) return null;
      ctx.addIssue({ code: "custom", message: `${label}: enter an amount like 1299 or 1299.50` });
      return z.NEVER;
    }
    return paise;
  });

export const variantInput = z.object({
  id: z.string().optional(),
  size: text(30),
  colour: text(30),
  sku: text(40),
  barcode: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || /^[0-9A-Za-z\-]{4,32}$/.test(v), "Barcode: 4–32 letters/numbers"),
  mrp: money("MRP", false),
  price: money("Selling price", true),
  cost: money("Cost price", false),
  reorderLevel: z.coerce.number().int().min(0).max(9999).default(2),
  openingStock: z.coerce.number().int().min(0, "Opening stock can't be negative").max(99999).default(0),
});

export const itemInput = z.object({
  type: z.enum(["GOODS", "SERVICE", "RENTAL", "NON_INVENTORY"]),
  name: z.string().trim().min(2, "Enter a product name").max(120),
  categoryName: text(60),
  brand: text(60),
  collection: text(60),
  description: text(1000),
  taxCode: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || /^\d{4,8}$/.test(v), "HSN/SAC code: 4–8 digits"),
  gstRateBp: z.coerce.number().int().min(0).max(4000),
  taxInclusive: z.boolean().default(true),
  priceAtCounter: z.boolean().default(false),
  turnaroundDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
  variants: z.array(variantInput).min(1, "Add at least one variant").max(100, "A product can have at most 100 variants"),
});

export type ItemInput = z.infer<typeof itemInput>;

export async function upsertCategory(tx: Tx, tenantId: string, name: string | null) {
  if (!name) return null;
  const category = await tx.category.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: {},
    create: { tenantId, name },
  });
  return category.id;
}

/** Reserve `count` sequential in-store barcodes for the tenant (row-locked increment). */
export async function reserveBarcodes(tx: Tx, tenantId: string, count: number) {
  if (count === 0) return [];
  const tenant = await tx.tenant.update({ where: { id: tenantId }, data: { barcodeSeq: { increment: count } }, select: { barcodeSeq: true } });
  const first = tenant.barcodeSeq - count + 1;
  return Array.from({ length: count }, (_, i) => inStoreBarcode(first + i));
}

/** Make SKUs unique within the tenant and within this batch by suffixing -2, -3… */
export async function uniqueSkus(tx: Tx, tenantId: string, wanted: string[], ignoreVariantIds: string[] = []) {
  const existing = await tx.variant.findMany({
    where: { tenantId, sku: { in: wanted.flatMap((s) => [s, ...Array.from({ length: 20 }, (_, i) => `${s}-${i + 2}`)]) }, id: { notIn: ignoreVariantIds } },
    select: { sku: true },
  });
  const taken = new Set(existing.map((v) => v.sku));
  return wanted.map((sku) => {
    let candidate = sku;
    for (let n = 2; taken.has(candidate); n++) candidate = `${sku}-${n}`;
    taken.add(candidate);
    return candidate;
  });
}

export class CatalogueError extends Error {}

/** Create or update an item with its variants. Stock for new variants enters as an OPENING movement. */
export async function saveItem(tx: Tx, tenantId: string, userId: string, input: ItemInput, itemId?: string) {
  const stock = tracksStock(input.type as ItemType);
  const categoryId = await upsertCategory(tx, tenantId, input.categoryName);

  const data = {
    type: input.type,
    name: input.name,
    categoryId,
    brand: input.brand,
    collection: input.collection,
    description: input.description,
    taxCode: input.taxCode,
    gstRateBp: input.gstRateBp,
    taxInclusive: input.taxInclusive,
    priceAtCounter: input.type === "SERVICE" ? input.priceAtCounter : false,
    turnaroundDays: input.type === "SERVICE" ? (input.turnaroundDays ?? null) : null,
  };

  let item;
  if (itemId) {
    const found = await tx.item.findFirst({ where: { id: itemId, tenantId }, select: { id: true } });
    if (!found) throw new CatalogueError("Product not found");
    item = await tx.item.update({ where: { id: itemId }, data });
  } else {
    item = await tx.item.create({ data: { ...data, tenantId } });
  }

  // Duplicate size+colour combinations would confuse billing.
  const combos = new Set<string>();
  for (const v of input.variants) {
    const key = `${v.size ?? ""}|${v.colour ?? ""}`.toLowerCase();
    if (combos.has(key)) throw new CatalogueError(`Two variants have the same size and colour (${v.size ?? "—"} / ${v.colour ?? "—"})`);
    combos.add(key);
  }

  const existingVariants = await tx.variant.findMany({ where: { itemId: item.id, tenantId } });
  const keptIds = input.variants.map((v) => v.id).filter((id): id is string => Boolean(id));
  for (const id of keptIds) if (!existingVariants.some((v) => v.id === id)) throw new CatalogueError("Variant not found");

  // Barcodes: keep typed ones (must be unique), generate the rest.
  const typedBarcodes = input.variants.map((v) => v.barcode).filter((b): b is string => Boolean(b));
  if (new Set(typedBarcodes).size !== typedBarcodes.length) throw new CatalogueError("Two variants have the same barcode");
  for (const code of typedBarcodes) {
    if (/^\d{13}$/.test(code) && !isValidEan13(code)) throw new CatalogueError(`Barcode ${code} has a wrong check digit`);
  }
  const clash = await tx.variant.findFirst({
    where: { tenantId, barcode: { in: typedBarcodes }, id: { notIn: keptIds } },
    select: { barcode: true, item: { select: { name: true } } },
  });
  if (clash) throw new CatalogueError(`Barcode ${clash.barcode} is already used by “${clash.item.name}”`);
  const generated = await reserveBarcodes(tx, tenantId, input.variants.filter((v) => !v.barcode).length);

  const skus = await uniqueSkus(
    tx,
    tenantId,
    input.variants.map((v) => v.sku ?? makeSku(input.name, v.size, v.colour)),
    keptIds,
  );

  const saved: string[] = [];
  for (const [index, v] of input.variants.entries()) {
    const barcode = v.barcode ?? generated.shift()!;
    const price = v.price ?? 0; // validated as required above
    const common = {
      size: v.size,
      colour: v.colour,
      sku: skus[index],
      barcode,
      mrp: v.mrp ?? price,
      price,
      cost: v.cost,
      reorderLevel: stock ? v.reorderLevel : 0,
      sortOrder: index,
      active: true,
    };
    if (v.id) {
      await tx.variant.update({ where: { id: v.id }, data: common });
      saved.push(v.id);
    } else {
      const opening = stock ? v.openingStock : 0;
      const created = await tx.variant.create({ data: { ...common, tenantId, itemId: item.id, onHand: opening } });
      if (opening > 0) {
        await tx.stockMovement.create({
          data: { tenantId, variantId: created.id, userId, type: "OPENING", qty: opening, balanceAfter: opening, reason: "Opening stock" },
        });
      }
      saved.push(created.id);
    }
  }

  // Removed variants are deactivated (history and old bills keep pointing at them).
  const removed = existingVariants.filter((v) => !saved.includes(v.id)).map((v) => v.id);
  if (removed.length) await tx.variant.updateMany({ where: { id: { in: removed } }, data: { active: false } });

  return item;
}
