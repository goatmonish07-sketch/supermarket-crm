import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseRange } from "@/lib/reports";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const { from, to } = parseRange(searchParams.get("from") || undefined, searchParams.get("to") || undefined);

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "asc" },
    include: { customer: { select: { name: true } }, user: { select: { name: true } } },
  });

  const header = ["Invoice No", "Date", "Customer", "Cashier", "Payment", "Status", "Subtotal", "Tax", "Discount", "Grand Total", "Paid", "Due"];
  const rows = invoices.map((i) => [
    i.invoiceNo,
    i.createdAt.toISOString(),
    i.customer?.name ?? "Walk-in",
    i.user.name,
    i.paymentMode,
    i.status,
    i.subtotal.toFixed(2),
    i.taxTotal.toFixed(2),
    i.discount.toFixed(2),
    i.grandTotal.toFixed(2),
    i.paidAmount.toFixed(2),
    i.dueAmount.toFixed(2),
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const filename = `sales-report_${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
