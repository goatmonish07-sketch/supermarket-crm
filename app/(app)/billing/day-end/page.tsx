import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PAYMENT_LABEL } from "@/lib/billing";
import { dayRange, localDate } from "@/lib/dates";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { PrintButton } from "./print-button";

export const metadata = { title: "Day-end report" };

export default async function DayEndPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const user = await requirePermission("billing.use");
  const tz = user.store?.timezone ?? "Asia/Kolkata";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : localDate(new Date(), tz);
  const { start, end } = dayRange(date, tz);
  const inDay = { gte: start, lt: end };
  const live = { tenantId: user.tenantId, createdAt: inDay, status: { not: "CANCELLED" as const } };

  const [sales, cancelled, salePayments, advances, returns, top] = await Promise.all([
    db.sale.aggregate({
      where: live,
      _count: true,
      _sum: { grossTotal: true, discountTotal: true, taxableTotal: true, taxTotal: true, total: true, paidTotal: true, roundOff: true },
    }),
    db.sale.aggregate({ where: { tenantId: user.tenantId, createdAt: inDay, status: "CANCELLED" }, _count: true, _sum: { total: true } }),
    // Bill payments settled from an advance were already counted when the advance was taken.
    db.payment.groupBy({ by: ["method"], where: { sale: { tenantId: user.tenantId }, createdAt: inDay, fromAdvance: false }, _sum: { amount: true } }),
    db.orderPayment.groupBy({ by: ["method"], where: { order: { tenantId: user.tenantId }, createdAt: inDay }, _sum: { amount: true } }),
    db.saleReturn.aggregate({ where: { tenantId: user.tenantId, createdAt: inDay }, _count: true, _sum: { amount: true } }),
    db.saleItem.groupBy({
      by: ["name"],
      where: { sale: live },
      _sum: { qty: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 8,
    }),
  ]);
  const s = sales._sum;
  const advanceTotal = advances.reduce((sum, a) => sum + (a._sum.amount ?? 0), 0);
  const merged = new Map<keyof typeof PAYMENT_LABEL, number>();
  for (const p of [...salePayments, ...advances]) merged.set(p.method, (merged.get(p.method) ?? 0) + (p._sum.amount ?? 0));
  const payments = [...merged].map(([method, amount]) => ({ method, amount }));
  const due = (s.total ?? 0) - (s.paidTotal ?? 0);
  const net = payments.reduce((sum, p) => sum + p.amount, 0);
  const cash = merged.get("CASH") ?? 0;
  const pretty = new Date(start.getTime() + 12 * 3600_000).toLocaleDateString("en-IN", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className={strong ? "flex justify-between border-t border-border/70 pt-2 text-base font-bold" : "flex justify-between"}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <PageHeader
          title="Day-end report"
          subtitle={pretty}
          back={{ href: "/billing/bills", label: "Bills" }}
          actions={
            <>
              <form className="flex gap-2">
                <label className="sr-only" htmlFor="date">
                  Date
                </label>
                <input id="date" name="date" type="date" defaultValue={date} max={localDate(new Date(), tz)} className="input h-12 w-auto" />
                <button className="btn-outline h-12">Show</button>
              </form>
              <PrintButton />
            </>
          }
        />
      </div>

      <section className="card mx-auto max-w-xl print:max-w-[72mm] print:border-0 print:p-0 print:font-mono print:text-[11px] print:shadow-none">
        <h2 className="hidden text-center font-bold print:block">
          {user.store?.name} · Day end
          <br />
          {date}
        </h2>
        <h3 className="text-lg font-semibold print:mt-2 print:text-[12px]">Sales</h3>
        <dl className="mt-2 space-y-1.5 text-sm print:text-[11px]">
          <Row label="Bills" value={String(sales._count)} />
          <Row label="Gross (MRP value)" value={formatMoney(s.grossTotal ?? 0)} />
          <Row label="Discounts" value={`- ${formatMoney(s.discountTotal ?? 0)}`} />
          <Row label="Taxable value" value={formatMoney(s.taxableTotal ?? 0)} />
          <Row label="GST" value={formatMoney(s.taxTotal ?? 0)} />
          <Row label="Round off" value={formatMoney(s.roundOff ?? 0)} />
          <Row label="Sales total" value={formatMoney(s.total ?? 0)} strong />
          {due > 0 && <Row label="Given on credit" value={formatMoney(due)} />}
          <Row label={`Returns (${returns._count})`} value={`- ${formatMoney(returns._sum.amount ?? 0)}`} />
          <Row label={`Cancelled bills (${cancelled._count})`} value={formatMoney(cancelled._sum.total ?? 0)} />
        </dl>

        <h3 className="mt-6 text-lg font-semibold print:mt-3 print:text-[12px]">Money collected</h3>
        <dl className="mt-2 space-y-1.5 text-sm print:text-[11px]">
          {payments.length === 0 && <p className="text-muted">No payments.</p>}
          {payments.map((p) => (
            <Row key={p.method} label={PAYMENT_LABEL[p.method]} value={formatMoney(p.amount)} />
          ))}
          {advanceTotal !== 0 && <Row label="…of which order advances" value={formatMoney(advanceTotal)} />}
          <Row label="Net collected" value={formatMoney(net)} strong />
        </dl>
        <p className="mt-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm print:rounded-none print:border print:border-black print:bg-transparent print:text-[11px]">
          Cash expected in drawer from sales: <strong className="tabular">{formatMoney(cash)}</strong> (add your opening cash).
        </p>

        {top.length > 0 && (
          <>
            <h3 className="mt-6 text-lg font-semibold print:mt-3 print:text-[12px]">Top items</h3>
            <ul className="mt-2 space-y-1.5 text-sm print:text-[11px]">
              {top.map((t) => (
                <li key={t.name} className="flex justify-between gap-3">
                  <span className="truncate">
                    <span className="tabular">{t._sum.qty}</span> × {t.name}
                  </span>
                  <span className="tabular">{formatMoney(t._sum.total ?? 0)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
