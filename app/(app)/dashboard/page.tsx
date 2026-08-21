import Link from "next/link";
import {
  Wallet, IndianRupee, Users, NotebookPen, PackageX, ArrowRight,
  ShoppingCart, PackagePlus, UserPlus, Download, TrendingUp, Package,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { formatINR, formatNumber, formatDate, greetingByHour, compactNumber } from "@/lib/format";
import StatCard from "@/components/ui/StatCard";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import PaymentDonut from "@/components/charts/PaymentDonut";
import { StatusBadge } from "@/components/ui/Badges";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [user, data] = await Promise.all([getSession(), getDashboardData()]);
  const { kpis, revenueTrend, paymentSplit, topProducts, lowStock, recentInvoices } = data;
  const firstName = user?.name.split(" ")[0] ?? "there";

  const quickActions = [
    { href: "/pos", label: "New Sale", sub: "Start billing", icon: ShoppingCart },
    { href: "/products", label: "Add Product", sub: "New item", icon: PackagePlus },
    { href: "/customers", label: "Add Customer", sub: "New profile", icon: UserPlus },
    { href: "/reports", label: "View Reports", sub: "Sales & GST", icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            {greetingByHour()}, {firstName} <span className="align-middle">👋</span>
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Here's what's happening at your store today.</p>
        </div>
        <p className="text-sm font-medium text-ink-soft">
          {formatDate(new Date(), false)}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Today's Sales" value={formatINR(kpis.todaySales, { compact: true })}
          icon={Wallet} delta={kpis.todaySalesDelta} deltaLabel={`${kpis.todayInvoiceCount} invoices today`} tone="violet" />
        <StatCard label="Revenue (7 days)" value={formatINR(kpis.revenue7, { compact: true })}
          icon={IndianRupee} delta={kpis.revenueDelta} deltaLabel="vs previous 7 days" tone="emerald" />
        <StatCard label="Total Customers" value={formatNumber(kpis.totalCustomers)}
          icon={Users} delta={kpis.customersDelta} deltaLabel="vs last week" tone="blue" />
        <StatCard label="Pending Dues" value={formatINR(kpis.dues, { compact: true })}
          icon={NotebookPen} deltaLabel="khata outstanding" tone="amber" />
        <StatCard label="Low Stock Items" value={formatNumber(kpis.lowStockCount)}
          icon={PackageX} deltaLabel="need restock" tone="rose" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="card card-pad lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Revenue Trend</h2>
              <p className="text-xs text-ink-muted">Last 14 days</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-ink tnum">{formatINR(kpis.revenue7, { compact: true })}</p>
              <span className="badge-violet">Last 7d</span>
            </div>
          </div>
          <RevenueTrendChart data={revenueTrend} />
        </div>

        <div className="card card-pad lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Payment Mode Split</h2>
              <p className="text-xs text-ink-muted">Last 7 days</p>
            </div>
          </div>
          <PaymentDonut data={paymentSplit} />
        </div>
      </div>

      {/* Lists row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top products */}
        <div className="card">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <TrendingUp className="h-4 w-4 text-violet-500" /> Top Selling
            </h2>
            <Link href="/reports" className="text-xs font-semibold text-violet-600 hover:underline">View all</Link>
          </div>
          <div className="mt-3 divide-y divide-violet-100/70">
            {topProducts.length === 0 && <p className="px-5 py-6 text-sm text-ink-muted">No sales yet.</p>}
            {topProducts.map((p, i) => (
              <div key={p.productId ?? i} className="flex items-center gap-3 px-5 py-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-100 text-xs font-bold text-violet-600">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-ink-muted">{p.qty} units sold</p>
                </div>
                <p className="text-sm font-semibold text-ink tnum">{formatINR(p.revenue, { compact: true })}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Low stock */}
        <div className="card">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <PackageX className="h-4 w-4 text-rose-500" /> Low Stock Alerts
            </h2>
            <Link href="/products?filter=low" className="text-xs font-semibold text-violet-600 hover:underline">View all</Link>
          </div>
          <div className="mt-3 divide-y divide-violet-100/70">
            {lowStock.length === 0 && <p className="px-5 py-6 text-sm text-ink-muted">All items well stocked. 🎉</p>}
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500">
                  <Package className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-ink-muted">Min: {formatNumber(p.lowStockThreshold)} {p.unit}</p>
                </div>
                <span className={p.stock <= 0 ? "badge-danger" : "badge-warning"}>
                  {formatNumber(p.stock)} left
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent invoices */}
        <div className="card">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <IndianRupee className="h-4 w-4 text-emerald-500" /> Recent Invoices
            </h2>
            <Link href="/invoices" className="text-xs font-semibold text-violet-600 hover:underline">View all</Link>
          </div>
          <div className="mt-3 divide-y divide-violet-100/70">
            {recentInvoices.length === 0 && <p className="px-5 py-6 text-sm text-ink-muted">No invoices yet.</p>}
            {recentInvoices.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-violet-50/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{inv.customer?.name ?? "Walk-in Customer"}</p>
                  <p className="text-xs text-ink-muted">{inv.invoiceNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink tnum">{formatINR(inv.grandTotal, { compact: true })}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card card-pad">
        <h2 className="mb-4 text-base font-bold text-ink">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href}
                className="group flex items-center gap-3 rounded-xl border border-violet-100 bg-brand-softer p-4 transition-all hover:border-violet-200 hover:shadow-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white transition-transform group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{a.label}</p>
                  <p className="text-xs text-ink-muted">{a.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
