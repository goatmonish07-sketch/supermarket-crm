import Link from "next/link";
import { ReceiptText, Search, ChevronRight, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatINR, formatDate, formatTime } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { StatusBadge, PaymentBadge } from "@/components/ui/Badges";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const status = searchParams.status || "";

  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { invoiceNo: { contains: q } },
      { customer: { name: { contains: q } } },
    ];
  }

  const [invoices, agg] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { name: true } }, user: { select: { name: true } }, _count: { select: { items: true } } },
    }),
    prisma.invoice.aggregate({ _sum: { grandTotal: true, dueAmount: true }, _count: true, where }),
  ]);

  const statusTabs = [
    { key: "", label: "All" },
    { key: "PAID", label: "Paid" },
    { key: "PARTIAL", label: "Partial" },
    { key: "DUE", label: "Due" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Invoices" subtitle={`${agg._count} invoices · ${formatINR(agg._sum.grandTotal ?? 0)} total`}>
        <Link href="/pos" className="btn-primary btn-sm"><Plus className="h-4 w-4" /> New Sale</Link>
      </PageHeader>

      {/* Filter bar */}
      <div className="card card-pad">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input name="q" defaultValue={q} placeholder="Search invoice no. or customer..." className="input pl-10" />
          </div>
          <input type="hidden" name="status" value={status} />
          <button className="btn-primary btn-sm">Search</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {statusTabs.map((t) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (t.key) params.set("status", t.key);
            const active = status === t.key;
            return (
              <Link key={t.label} href={`/invoices?${params.toString()}`}
                className={`btn-sm rounded-full px-4 ${active ? "bg-brand-gradient text-white" : "bg-violet-50 text-ink-soft hover:bg-violet-100"}`}>
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {invoices.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No invoices found" description="Try a different search, or create a new sale from the POS.">
            <Link href="/pos" className="btn-primary btn-sm"><Plus className="h-4 w-4" /> New Sale</Link>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-surface-sunken">
                  <th className="th">Invoice</th>
                  <th className="th">Customer</th>
                  <th className="th">Date</th>
                  <th className="th">Payment</th>
                  <th className="th text-right">Amount</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-violet-50/40">
                    <td className="td font-semibold text-ink">{inv.invoiceNo}</td>
                    <td className="td">{inv.customer?.name ?? "Walk-in Customer"}</td>
                    <td className="td whitespace-nowrap">
                      {formatDate(inv.createdAt)} <span className="text-ink-muted">· {formatTime(inv.createdAt)}</span>
                    </td>
                    <td className="td"><PaymentBadge mode={inv.paymentMode} /></td>
                    <td className="td text-right font-semibold text-ink tnum">{formatINR(inv.grandTotal)}</td>
                    <td className="td"><StatusBadge status={inv.status} /></td>
                    <td className="td text-right">
                      <Link href={`/invoices/${inv.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:underline">
                        View <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
