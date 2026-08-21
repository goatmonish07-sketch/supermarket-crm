import { IndianRupee, Receipt, Percent, TrendingUp, ShoppingBag } from "lucide-react";
import { parseRange, getReport } from "@/lib/reports";
import { formatINR, formatNumber } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import ReportControls from "@/components/reports/ReportControls";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import PaymentDonut from "@/components/charts/PaymentDonut";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const range = parseRange(searchParams.from, searchParams.to);
  const report = await getReport(range);
  const { summary, daily, categories, topProducts, payments } = report;

  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);
  const maxCat = Math.max(1, ...categories.map((c) => c.revenue));
  const maxProd = Math.max(1, ...topProducts.map((p) => p.revenue));

  return (
    <div className="space-y-5">
      <PageHeader title="Reports & Analytics" subtitle="Sales performance, GST collected and product insights">
        <ReportControls from={fromStr} to={toStr} />
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={IndianRupee} label="Total Revenue" value={formatINR(summary.revenue, { compact: true })} tone="violet" />
        <SummaryCard icon={Receipt} label="Invoices" value={formatNumber(summary.invoices)} tone="blue" />
        <SummaryCard icon={ShoppingBag} label="Avg. Bill" value={formatINR(summary.avgBill, { compact: true })} tone="emerald" />
        <SummaryCard icon={Percent} label="GST Collected" value={formatINR(summary.tax, { compact: true })} tone="amber" />
      </div>

      {/* Daily + payments */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="card card-pad lg:col-span-3">
          <h2 className="text-base font-bold text-ink">Daily Sales</h2>
          <p className="mb-2 text-xs text-ink-muted">Revenue over selected period</p>
          <RevenueTrendChart data={daily} />
        </div>
        <div className="card card-pad lg:col-span-2">
          <h2 className="mb-4 text-base font-bold text-ink">Payment Modes</h2>
          <PaymentDonut data={payments} />
        </div>
      </div>

      {/* Category + top products */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink"><TrendingUp className="h-4 w-4 text-violet-500" /> Sales by Category</h2>
          <div className="space-y-3">
            {categories.length === 0 && <p className="text-sm text-ink-muted">No sales in this period.</p>}
            {categories.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-soft">{c.name}</span>
                  <span className="font-semibold text-ink tnum">{formatINR(c.revenue, { compact: true })}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div className="h-full rounded-full" style={{ width: `${(c.revenue / maxCat) * 100}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink"><ShoppingBag className="h-4 w-4 text-violet-500" /> Top Products</h2>
          <div className="space-y-3">
            {topProducts.length === 0 && <p className="text-sm text-ink-muted">No sales in this period.</p>}
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-100 text-xs font-bold text-violet-600">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                    <p className="ml-2 shrink-0 text-sm font-semibold text-ink tnum">{formatINR(p.revenue, { compact: true })}</p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(p.revenue / maxProd) * 100}%` }} />
                  </div>
                </div>
                <span className="shrink-0 text-xs text-ink-muted tnum">{formatNumber(p.qty)} sold</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    violet: "bg-violet-100 text-violet-600", blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600", amber: "bg-amber-100 text-amber-600",
  };
  return (
    <div className="card card-pad">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-2xl font-extrabold text-ink tnum">{value}</p>
    </div>
  );
}
