import type { ItemType, Variant } from "@prisma/client";

export const ITEM_TYPES: { value: ItemType; label: string; hint: string; tracksStock: boolean }[] = [
  { value: "GOODS", label: "Goods", hint: "Clothes & accessories with stock", tracksStock: true },
  { value: "SERVICE", label: "Service", hint: "Alteration, stitching, styling — no stock", tracksStock: false },
  { value: "RENTAL", label: "Rental", hint: "Outfits & jewellery given on rent", tracksStock: true },
  { value: "NON_INVENTORY", label: "Other charge", hint: "Carry bag, delivery, custom charge", tracksStock: false },
];

export function tracksStock(type: ItemType) {
  return type === "GOODS" || type === "RENTAL";
}

export const ITEM_TYPE_LABEL = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.label])) as Record<ItemType, string>;

// GST slabs offered in the editor (basis points). Apparel uses 5% or 18% depending on value.
export const GST_RATES_BP = [0, 300, 500, 1200, 1800, 2800, 4000];
export const formatRate = (bp: number) => `${bp / 100}%`;

export const SIZE_PRESETS = {
  Letter: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  Numeric: ["28", "30", "32", "34", "36", "38", "40", "42", "44"],
  Kids: ["0-1Y", "1-2Y", "2-3Y", "3-4Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"],
  Other: ["Free size", "Semi-stitched", "Unstitched"],
} as const;

export const COLOUR_PRESETS: { name: string; hex: string }[] = [
  { name: "Black", hex: "#1f1f1f" },
  { name: "White", hex: "#f7f7f2" },
  { name: "Red", hex: "#c0392b" },
  { name: "Maroon", hex: "#7b1e2b" },
  { name: "Pink", hex: "#e889a8" },
  { name: "Peach", hex: "#f4b494" },
  { name: "Orange", hex: "#e67e22" },
  { name: "Mustard", hex: "#d4a017" },
  { name: "Yellow", hex: "#f1c40f" },
  { name: "Green", hex: "#2e8b57" },
  { name: "Mint", hex: "#9fd8c0" },
  { name: "Teal", hex: "#14808a" },
  { name: "Blue", hex: "#2f6fbf" },
  { name: "Navy", hex: "#1f2f5a" },
  { name: "Purple", hex: "#7d3c98" },
  { name: "Lavender", hex: "#b7a6d9" },
  { name: "Beige", hex: "#d9c7a7" },
  { name: "Brown", hex: "#7a4e2d" },
  { name: "Grey", hex: "#8c8c8c" },
  { name: "Gold", hex: "#c9a23f" },
  { name: "Silver", hex: "#bfc3c7" },
  { name: "Multi", hex: "conic-gradient(#c0392b,#f1c40f,#2e8b57,#2f6fbf,#7d3c98,#c0392b)" },
];

export function colourSwatch(name: string | null | undefined) {
  if (!name) return null;
  return COLOUR_PRESETS.find((c) => c.name.toLowerCase() === name.toLowerCase())?.hex ?? null;
}

// ─── Stock status ───────────────────────────────────────────────────────────

export type StockStatus = "IN_STOCK" | "LOW" | "OUT" | "NO_STOCK";

type StockFields = Pick<Variant, "onHand" | "reserved" | "inAlteration" | "damaged" | "reorderLevel">;

export function available(v: StockFields) {
  return v.onHand - v.reserved - v.inAlteration - v.damaged;
}

export function stockStatus(type: ItemType, v: StockFields): StockStatus {
  if (!tracksStock(type)) return "NO_STOCK";
  const qty = available(v);
  if (qty <= 0) return "OUT";
  if (qty <= v.reorderLevel) return "LOW";
  return "IN_STOCK";
}

/** Worst status across variants — what the product row shows. */
export function itemStockStatus(type: ItemType, variants: StockFields[]): StockStatus {
  if (!tracksStock(type)) return "NO_STOCK";
  const statuses = variants.map((v) => stockStatus(type, v));
  if (statuses.every((s) => s === "OUT")) return "OUT";
  if (statuses.some((s) => s === "OUT" || s === "LOW")) return "LOW";
  return "IN_STOCK";
}

export const STOCK_STATUS_FILTERS: { value: StockStatus; label: string }[] = [
  { value: "IN_STOCK", label: "In stock" },
  { value: "LOW", label: "Low stock" },
  { value: "OUT", label: "Out of stock" },
  { value: "NO_STOCK", label: "No stock (services)" },
];

// ─── Money ─────────────────────────────────────────────────────────────────

/** "1,299.50" / "1299.5" / "₹1299" -> 129950 paise. Returns null when not a number. */
export function parseRupees(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).replace(/[₹,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function rupees(paise: number | null | undefined) {
  if (paise === null || paise === undefined) return "";
  return (paise / 100).toFixed(2).replace(/\.00$/, "");
}

// ─── Codes ─────────────────────────────────────────────────────────────────

export function ean13CheckDigit(first12: string) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

/** In-store EAN-13 in the "20" restricted-circulation range: 20 + 10-digit sequence + check digit. */
export function inStoreBarcode(seq: number) {
  const body = "20" + String(seq).padStart(10, "0");
  return body + ean13CheckDigit(body);
}

export function isValidEan13(code: string) {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === code[12];
}

/** Readable SKU, e.g. "Anarkali Kurti" + M + Maroon -> "ANAKU-M-MAR". */
export function makeSku(name: string, size?: string | null, colour?: string | null) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const stem = (words.length === 1 ? words[0].slice(0, 5) : words.slice(0, 3).map((w) => w.slice(0, 3)).join("").slice(0, 6)) || "ITEM";
  const part = (v?: string | null, n = 3) => (v ? v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, n) : "");
  return [stem, part(size, 6), part(colour)].filter(Boolean).join("-");
}
