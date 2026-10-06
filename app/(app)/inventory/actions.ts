"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { available, tracksStock } from "@/lib/catalogue";

export type AdjustState = { error?: string; ok?: string } | undefined;

const schema = z.object({
  variantId: z.string().min(1),
  kind: z.enum(["STOCK_IN", "STOCK_OUT", "DAMAGED", "COUNT_CORRECTION"]),
  qty: z.coerce.number().int("Whole numbers only").min(0, "Quantity can't be negative").max(99999),
  reason: z.string().trim().max(120).optional(),
});

class AdjustError extends Error {}

export async function adjustStockAction(_prev: AdjustState, formData: FormData): Promise<AdjustState> {
  const user = await requirePermission("inventory.manage");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { variantId, kind, qty, reason } = parsed.data;
  if (kind !== "COUNT_CORRECTION" && qty === 0) return { error: "Enter a quantity above 0" };

  try {
    const message = await db.$transaction(async (tx) => {
      // Row lock so two people adjusting the same variant can't race.
      await tx.$queryRaw`SELECT id FROM "Variant" WHERE id = ${variantId} AND "tenantId" = ${user.tenantId} FOR UPDATE`;
      const v = await tx.variant.findFirst({ where: { id: variantId, tenantId: user.tenantId }, include: { item: { select: { type: true, name: true } } } });
      if (!v) throw new AdjustError("Variant not found");
      if (!tracksStock(v.item.type)) throw new AdjustError("Services don't have stock");

      let onHand = v.onHand;
      let damaged = v.damaged;
      let delta = 0;
      if (kind === "STOCK_IN") delta = qty;
      if (kind === "STOCK_OUT") {
        if (qty > available(v)) throw new AdjustError(`Only ${Math.max(0, available(v))} available to remove`);
        delta = -qty;
      }
      if (kind === "COUNT_CORRECTION") {
        if (qty < v.reserved + v.inAlteration + v.damaged) throw new AdjustError("Count is lower than reserved + in alteration + damaged pieces");
        delta = qty - v.onHand;
      }
      if (kind === "DAMAGED") {
        if (qty > available(v)) throw new AdjustError(`Only ${Math.max(0, available(v))} available to mark damaged`);
        damaged += qty;
      }
      onHand += delta;

      await tx.variant.update({ where: { id: v.id }, data: { onHand, damaged } });
      await tx.stockMovement.create({
        data: {
          tenantId: user.tenantId,
          variantId: v.id,
          userId: user.id,
          type: kind,
          qty: kind === "DAMAGED" ? qty : delta,
          balanceAfter: onHand,
          reason: reason || null,
        },
      });
      return `${v.item.name}: ${kind === "DAMAGED" ? `${qty} marked damaged` : `stock now ${onHand}`}`;
    });

    await audit(user.tenantId, user.id, "stock.adjust", { entity: "variant", entityId: variantId, details: { kind, qty } });
    revalidatePath("/inventory");
    revalidatePath("/products");
    return { ok: message };
  } catch (e) {
    if (e instanceof AdjustError) return { error: e.message };
    throw e;
  }
}
