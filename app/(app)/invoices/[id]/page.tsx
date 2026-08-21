import { notFound } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatINR, formatDate, formatTime, formatNumber } from "@/lib/format";
import { StatusBadge, PaymentBadge } from "@/components/ui/Badges";
import PrintControls from "@/components/invoice/PrintControls";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: { items: true, customer: true, user: { select: { name: true } } },
    }),
    getSettings(),
  ]);

  if (!invoice) notFound();

  const cgst = invoice.taxTotal / 2;
  const sgst = invoice.taxTotal / 2;

  return (
    <div className="mx-auto max-w-3xl">
      <PrintControls />

      <div className="print-area card overflow-hidden">
        {/* Header */}
        <div className="bg-brand-gradient px-8 py-7 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xl font-extrabold leading-none">{settings.shopName}</p>
                <p className="mt-1 text-xs text-violet-100">{settings.tagline}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold leading-none">INVOICE</p>
              <p className="mt-1 text-sm font-medium text-violet-100">{invoice.invoiceNo}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs text-violet-100">
            <span>{settings.address}</span>
            <span>GSTIN: {settings.gstin} · {settings.phone}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 border-b border-violet-100 px-8 py-5 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Billed To</p>
            <p className="mt-1 text-sm font-semibold text-ink">{invoice.customer?.name ?? "Walk-in Customer"}</p>
            {invoice.customer?.phone && <p className="text-xs text-ink-muted">{invoice.customer.phone}</p>}
            {invoice.customer?.address && <p className="text-xs text-ink-muted">{invoice.customer.address}</p>}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Date & Time</p>
            <p className="mt-1 text-sm font-semibold text-ink">{formatDate(invoice.createdAt)}</p>
            <p className="text-xs text-ink-muted">{formatTime(invoice.createdAt)} · by {invoice.user.name}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Status</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <StatusBadge status={invoice.status} />
              <PaymentBadge mode={invoice.paymentMode} />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto px-8 py-2">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-violet-100">
                <th className="th pl-0">Item</th>
                <th className="th text-center">GST</th>
                <th className="th text-right">Price</th>
                <th className="th text-center">Qty</th>
                <th className="th pr-0 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it) => (
                <tr key={it.id}>
                  <td className="td border-violet-100/70 pl-0 font-medium text-ink">{it.name}</td>
                  <td className="td border-violet-100/70 text-center text-ink-muted">{it.taxRate}%</td>
                  <td className="td border-violet-100/70 text-right tnum">{formatINR(it.unitPrice)}</td>
                  <td className="td border-violet-100/70 text-center tnum">{formatNumber(it.qty)}</td>
                  <td className="td border-violet-100/70 pr-0 text-right font-semibold text-ink tnum">{formatINR(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end px-8 pb-6 pt-2">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <Row label="Subtotal" value={formatINR(invoice.subtotal)} />
            {invoice.discount > 0 && <Row label="Discount" value={`− ${formatINR(invoice.discount)}`} />}
            <Row label="CGST" value={formatINR(cgst)} muted />
            <Row label="SGST" value={formatINR(sgst)} muted />
            <div className="flex items-center justify-between rounded-xl bg-brand-soft px-3 py-2.5">
              <span className="font-bold text-ink">Grand Total</span>
              <span className="text-lg font-extrabold text-violet-600 tnum">{formatINR(invoice.grandTotal)}</span>
            </div>
            <Row label="Paid" value={formatINR(invoice.paidAmount)} />
            {invoice.dueAmount > 0 && <Row label="Balance Due" value={formatINR(invoice.dueAmount)} danger />}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-violet-100 bg-surface-sunken px-8 py-5 text-center">
          <p className="text-sm font-semibold text-ink">Thank you for shopping with us! 🛍️</p>
          <p className="mt-1 text-xs text-ink-muted">This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, danger }: { label: string; value: string; muted?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className={muted ? "text-ink-muted" : "text-ink-soft"}>{label}</span>
      <span className={`font-medium tnum ${danger ? "text-danger" : "text-ink"}`}>{value}</span>
    </div>
  );
}
