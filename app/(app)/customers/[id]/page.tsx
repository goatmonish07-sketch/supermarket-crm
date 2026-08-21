import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, NotebookPen, ReceiptText, Phone, Mail, MapPin, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatINR, formatDate, formatNumber } from "@/lib/format";
import { StatusBadge, PaymentBadge } from "@/components/ui/Badges";
import EmptyState from "@/components/ui/EmptyState";
import CollectDue from "@/components/customer/CollectDue";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!customer) notFound();

  const totalSpent = customer.invoices.reduce((s, i) => s + i.grandTotal, 0);

  return (
    <div className="space-y-5">
      <Link href="/customers" className="btn-ghost btn-sm -ml-2"><ArrowLeft className="h-4 w-4" /> All customers</Link>

      {/* Profile header */}
      <div className="card card-pad">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-xl font-extrabold text-white">
              {customer.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-ink">{customer.name}</h1>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.phone}</span>
                {customer.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{customer.email}</span>}
                {customer.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{customer.address}</span>}
              </div>
            </div>
          </div>
          <CollectDue customerId={customer.id} dueBalance={customer.dueBalance} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={ShoppingBag} label="Total Spent" value={formatINR(totalSpent, { compact: true })} tone="violet" />
        <MiniStat icon={ReceiptText} label="Total Bills" value={formatNumber(customer.invoices.length)} tone="blue" />
        <MiniStat icon={Star} label="Loyalty Points" value={formatNumber(customer.loyaltyPoints)} tone="amber" />
        <MiniStat icon={NotebookPen} label="Dues Balance" value={formatINR(customer.dueBalance, { compact: true })} tone={customer.dueBalance > 0 ? "rose" : "emerald"} />
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <h2 className="px-5 pt-5 text-base font-bold text-ink">Purchase History</h2>
        {customer.invoices.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No purchases yet" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-surface-sunken">
                  <th className="th">Invoice</th>
                  <th className="th">Date</th>
                  <th className="th">Payment</th>
                  <th className="th text-right">Amount</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-violet-50/40">
                    <td className="td"><Link href={`/invoices/${inv.id}`} className="font-semibold text-violet-600 hover:underline">{inv.invoiceNo}</Link></td>
                    <td className="td whitespace-nowrap">{formatDate(inv.createdAt)}</td>
                    <td className="td"><PaymentBadge mode={inv.paymentMode} /></td>
                    <td className="td text-right font-semibold text-ink tnum">{formatINR(inv.grandTotal)}</td>
                    <td className="td"><StatusBadge status={inv.status} /></td>
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

function MiniStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    violet: "bg-violet-100 text-violet-600", blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600", rose: "bg-rose-100 text-rose-600", emerald: "bg-emerald-100 text-emerald-600",
  };
  return (
    <div className="card card-pad">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-xl font-extrabold text-ink tnum">{value}</p>
    </div>
  );
}
