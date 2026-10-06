import "server-only";
import ExcelJS from "exceljs";
import type { ItemType } from "@prisma/client";
import { itemInput } from "./catalogue-server";

export const MAX_IMPORT_ROWS = 2000;

/** Column headers we understand (lower-cased). First entry is what the template uses. */
const COLUMNS = {
  name: ["name", "product", "product name", "item", "item name"],
  type: ["type", "item type"],
  category: ["category"],
  brand: ["brand"],
  collection: ["collection", "season"],
  size: ["size"],
  colour: ["colour", "color"],
  price: ["price", "selling price", "sale price", "rate"],
  mrp: ["mrp"],
  cost: ["cost", "cost price", "purchase price"],
  stock: ["stock", "qty", "quantity", "opening stock"],
  alertAt: ["alert at", "reorder level", "low stock at"],
  gst: ["gst %", "gst", "gst rate", "tax %"],
  taxCode: ["hsn/sac", "hsn", "sac", "hsn code"],
  sku: ["sku"],
  barcode: ["barcode", "ean"],
} as const;

type Column = keyof typeof COLUMNS;
export const TEMPLATE_HEADERS = Object.values(COLUMNS).map((aliases) => aliases[0].replace(/\b\w/g, (c) => c.toUpperCase()));

type RawRow = Partial<Record<Column, string>> & { line: number };

export type PreviewGroup = { name: string; type: string; variants: number; stock: number; error?: string; lines: string };
/** `valid` holds the raw (un-transformed) rows; the commit step validates them again on the server. */
export type ImportPreview = { fileName: string; groups: PreviewGroup[]; valid: unknown[]; rowCount: number; unknownColumns: string[] };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";" || ch === "\t") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (r) => {
    const values: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      const cell = r.getCell(c);
      values.push(cell.text?.trim() ?? "");
    }
    rows.push(values);
  });
  return rows;
}

const TYPE_WORDS: Record<string, ItemType> = {
  goods: "GOODS",
  product: "GOODS",
  service: "SERVICE",
  services: "SERVICE",
  rental: "RENTAL",
  rent: "RENTAL",
  other: "NON_INVENTORY",
  charge: "NON_INVENTORY",
  "other charge": "NON_INVENTORY",
};

export async function readImportFile(file: File): Promise<ImportPreview> {
  const lower = file.name.toLowerCase();
  const table = lower.endsWith(".xlsx") ? await parseXlsx(await file.arrayBuffer()) : parseCsv(await file.text());
  if (table.length < 2) throw new Error("The file has no data rows. Keep the header row and add one product per row.");

  const header = table[0].map((h) => h.trim().toLowerCase());
  const map = new Map<number, Column>();
  const unknownColumns: string[] = [];
  header.forEach((h, i) => {
    const col = (Object.keys(COLUMNS) as Column[]).find((k) => (COLUMNS[k] as readonly string[]).includes(h));
    if (col) map.set(i, col);
    else if (h) unknownColumns.push(table[0][i]);
  });
  if (![...map.values()].includes("name") || ![...map.values()].includes("price")) {
    throw new Error("Columns “Name” and “Price” are required. Download the template to see the expected columns.");
  }

  const dataRows = table.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) throw new Error(`Import up to ${MAX_IMPORT_ROWS} rows at a time. This file has ${dataRows.length}.`);

  const raw: RawRow[] = dataRows.map((cells, i) => {
    const row: RawRow = { line: i + 2 };
    map.forEach((col, idx) => (row[col] = (cells[idx] ?? "").trim()));
    return row;
  });

  // One product per name (case-insensitive); each row is a variant.
  const groups = new Map<string, RawRow[]>();
  for (const r of raw) {
    if (!r.name) continue;
    const key = r.name.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const preview: PreviewGroup[] = [];
  const valid: unknown[] = [];
  for (const rows of groups.values()) {
    const first = rows[0];
    const type = TYPE_WORDS[(first.type ?? "goods").toLowerCase()] ?? null;
    const lines = rows.map((r) => r.line).join(", ");
    if (!type) {
      preview.push({ name: first.name!, type: first.type ?? "", variants: rows.length, stock: 0, lines, error: `Unknown type “${first.type}”. Use Goods, Service, Rental or Other.` });
      continue;
    }
    const gst = first.gst ? Number(first.gst.replace("%", "")) : 5;
    const candidate = {
      type,
      name: first.name,
      categoryName: first.category,
      brand: first.brand,
      collection: first.collection,
      description: "",
      taxCode: first.taxCode,
      gstRateBp: Number.isFinite(gst) ? Math.round(gst * 100) : NaN,
      taxInclusive: true,
      priceAtCounter: false,
      turnaroundDays: null,
      variants: rows.map((r) => ({
        size: r.size,
        colour: r.colour,
        sku: r.sku?.toUpperCase(),
        barcode: r.barcode,
        price: r.price ?? "",
        mrp: r.mrp ?? "",
        cost: r.cost ?? "",
        reorderLevel: r.alertAt || "2",
        openingStock: r.stock || "0",
      })),
    };
    const parsed = itemInput.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const rowIdx = issue.path[0] === "variants" && typeof issue.path[1] === "number" ? issue.path[1] : null;
      const where = rowIdx !== null ? `Row ${rows[rowIdx].line}: ` : "";
      const msg = issue.path[0] === "gstRateBp" ? "GST % must be a number like 5 or 18" : issue.message;
      preview.push({ name: first.name!, type, variants: rows.length, stock: 0, lines, error: where + msg });
      continue;
    }
    valid.push(candidate);
    preview.push({ name: parsed.data.name, type, variants: rows.length, stock: parsed.data.variants.reduce((s, v) => s + v.openingStock, 0), lines });
  }

  return { fileName: file.name, groups: preview, valid, rowCount: raw.length, unknownColumns };
}
