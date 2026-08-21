import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseRange, getInvoiceRowsForExport } from "@/lib/reports";
export const runtime = "edge";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = parseRange(searchParams.get("from") || undefined, searchParams.get("to") || undefined);
  const rows = await getInvoiceRowsForExport(range);

  const header = ["Invoice No", "Date", "Customer", "Cashier", "Payment", "Status", "Subtotal", "Tax", "Discount", "Grand Total", "Paid", "Due"];
  const body = rows.map((i) => [
    i.invoiceNo, i.createdAt, i.customerName ?? "Walk-in", i.userName, i.paymentMode, i.status,
    i.subtotal.toFixed(2), i.taxTotal.toFixed(2), i.discount.toFixed(2), i.grandTotal.toFixed(2), i.paidAmount.toFixed(2), i.dueAmount.toFixed(2),
  ]);

  const csv = [header, ...body].map((r) => r.map(csvCell).join(",")).join("\n");
  const filename = `sales-report_${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
