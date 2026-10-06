import type { Category, Item, Variant } from "@prisma/client";
import { rupees } from "@/lib/catalogue";
import type { EditorItem } from "./product-editor";

export const emptyItem: EditorItem = {
  type: "GOODS",
  name: "",
  categoryName: "",
  brand: "",
  collection: "",
  description: "",
  taxCode: "",
  gstRateBp: 500,
  taxInclusive: true,
  priceAtCounter: false,
  turnaroundDays: "",
  variants: [],
};

export function toEditorItem(item: Item & { category: Category | null; variants: Variant[] }): EditorItem {
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    categoryName: item.category?.name ?? "",
    brand: item.brand ?? "",
    collection: item.collection ?? "",
    description: item.description ?? "",
    taxCode: item.taxCode ?? "",
    gstRateBp: item.gstRateBp,
    taxInclusive: item.taxInclusive,
    priceAtCounter: item.priceAtCounter,
    turnaroundDays: item.turnaroundDays?.toString() ?? "",
    variants: item.variants.map((v) => ({
      id: v.id,
      size: v.size ?? "",
      colour: v.colour ?? "",
      price: rupees(v.price),
      mrp: rupees(v.mrp),
      cost: rupees(v.cost),
      reorderLevel: String(v.reorderLevel),
      openingStock: "0",
      sku: v.sku,
      barcode: v.barcode,
      onHand: v.onHand,
    })),
  };
}
