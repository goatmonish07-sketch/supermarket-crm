import { getCurrentUser } from "@/lib/auth";
import { TEMPLATE_HEADERS } from "@/lib/import";

const SAMPLE = [
  ["Anarkali Kurti", "Goods", "Kurtis", "Aura Label", "Festive 2026", "M", "Maroon", "1499", "1999", "720", "4", "2", "5", "6204", "", ""],
  ["Anarkali Kurti", "Goods", "Kurtis", "Aura Label", "Festive 2026", "L", "Maroon", "1499", "1999", "720", "3", "2", "5", "6204", "", ""],
  ["Blouse Stitching", "Service", "Tailoring", "", "", "", "", "650", "", "", "", "", "5", "998821", "", ""],
];

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET() {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const body = [TEMPLATE_HEADERS, ...SAMPLE].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="aurapos-products-template.csv"',
    },
  });
}
