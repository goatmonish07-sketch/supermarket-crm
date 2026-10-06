import type { ItemType } from "@prisma/client";

/** Catalogue entry sent to the counter (one per variant). Prices in paise. */
export type PosVariant = {
  id: string;
  itemId: string;
  name: string;
  category: string | null;
  size: string | null;
  colour: string | null;
  sku: string;
  barcode: string;
  price: number;
  mrp: number;
  available: number;
  reorderLevel: number;
  type: ItemType;
  priceAtCounter: boolean;
  taxInclusive: boolean;
  gstRateBp: number;
  gstSlabAbove: number | null;
  gstHighRateBp: number | null;
};

export type CartLine = {
  key: string;
  variantId: string;
  qty: number;
  priceOverride: number | null; // paise
  discount: string; // "10%" or rupees
  note: string;
};

export type CartCustomer = { id: string; name: string; phone: string };

export type CartState = {
  lines: CartLine[];
  billDiscount: string;
  customer: CartCustomer | null;
  salespersonId: string | null;
  heldBillId?: string;
};

export type StaffOption = { id: string; name: string };

export type PosSettings = {
  shopName: string;
  upiId: string | null;
  roundOff: boolean;
  allowNegativeStock: boolean;
  cashierMaxDiscountBp: number;
  canOverride: boolean;
  canCreateCustomer: boolean;
};

export const lineLabel = (v: Pick<PosVariant, "size" | "colour">) => [v.size, v.colour].filter(Boolean).join(" / ");
