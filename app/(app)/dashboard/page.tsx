import Link from "next/link";
import { CheckCircle2, Circle, PackagePlus, PartyPopper, Plus, ReceiptText, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { formatMoney } from "@/lib/utils";
import { dayRange, localDate, monthRange } from "@/lib/dates";
import { Avatar } from "@/components/ui/avatar";
import { Gauge } from "@/components/ui/gauge";
import { LiveClock } from "@/components/ui/live-clock";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";

export const metadata = { title: "Dashboard" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string; denied?: string }> }) {
  const { welcome, denied } = await searchParams;
  const user = await requireUser();
  const staff = await db.user.findMany({
    where: { tenantId: user.tenantId },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    take: 5,
  });
  const [staffCount, itemCount] = await Promise.all([
    db.user.count({ where: { tenantId: user.tenantId } }),
    db.item.count({ where: { tenantId: user.tenantId, active: true } }),
  ]);

  const store = user.store;
  const tz = store?.timezone ?? "Asia/Kolkata";
  const today = dayRange(localDate(new Date(), tz), tz);
  const yesterday = { start: new Date(today.start.getTime() - 86_400_000), end: today.start };
  const month = monthRange(new Date(), tz);

  const salesIn = async (r: { start: Date; end: Date }) => {
    const where = { tenantId: user.tenantId, status: { not: "CANCELLED" as const }, createdAt: { gte: r.start, lt: r.end } };
    const [agg, items, refunds] = await Promise.all([
      db.sale.aggregate({ where, _sum: { total: true }, _count: true }),
      db.saleItem.aggregate({ where: { sale: where }, _sum: { qty: true, returnedQty: true } }),
      db.saleReturn.aggregate({ where: { tenantId: user.tenantId, createdAt: { gte: r.start, lt: r.end } }, _sum: { amount: true } }),
    ]);
    const net = (agg._sum.total ?? 0) - (refunds._sum.amount ?? 0);
    return { net, bills: agg._count, items: (items._sum.qty ?? 0) - (items._sum.returnedQty ?? 0) };
  };
  const [t, y, m, saleCount] = await Promise.all([salesIn(today), salesIn(yesterday), salesIn(month), db.sale.count({ where: { tenantId: user.tenantId } })]);
  const avg = (x: { net: number; bills: number }) => (x.bills ? Math.round(x.net / x.bills) : 0);
  const change = (now: number, before: number, fmt: (n: number) => string) =>
    now === 0 && before === 0 ? undefined : { value: fmt(Math.abs(now - before)), up: now >= before, caption: "vs yesterday" };
  const target = store?.monthlyTarget ?? 0;
  const targetPct = target > 0 ? Math.min(100, Math.round((m.net / target) * 100)) : 0;

  const checklist = [
    { label: "Add shop address & GSTIN", done: Boolean(store?.address && store?.gstin), href: "/settings" },
    { label: "Pick your theme", done: user.theme !== "emerald" || user.themeMode !== "SYSTEM", href: "/settings" },
    { label: "Add a staff member", done: staffCount > 1, href: "/team" },
    { label: "Add products & services", done: itemCount > 0, href: itemCount > 0 ? "/products" : "/products/new" },
    { label: "Make your first bill", done: saleCount > 0, href: "/billing" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-4">
      {denied && (
        <p role="alert" className="rounded-2xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
          Your role doesn&apos;t have access to that page. Ask the shop owner if you need it.
        </p>
      )}

      <section className="card">
        {welcome && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm" role="status">
            <PartyPopper className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
            Your shop is ready. Your <strong>Shop ID</strong> for logging in is{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono font-semibold">{user.tenant.slug}</code>.
            </span>
          </div>
        )}
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Dashboard</h1>
        <p className="mt-2 text-lg text-muted">
          {greeting()}, {user.name.split(" ")[0]}. Here&apos;s {user.tenant.name} today.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:flex">
          {can(user.role, "billing.use") && (
            <Link href="/billing" className="btn-primary h-14 px-6 text-base">
              <Plus className="h-5 w-5" /> New Bill
            </Link>
          )}
          {can(user.role, "products.manage") && (
            <Link href="/products/new" className="btn-outline h-14 px-6 text-base">
              <PackagePlus className="h-5 w-5" /> Add Product
            </Link>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            featured
            label="Today's Sales"
            value={formatMoney(t.net)}
            change={change(t.net, y.net, formatMoney)}
            note={t.bills ? undefined : "Starts with your first bill"}
            href="/billing/day-end"
          />
          <StatCard label="Bills Today" value={String(t.bills)} change={change(t.bills, y.bills, String)} note="No bills yet" href="/billing/bills" />
          <StatCard label="Avg. Bill Value" value={formatMoney(avg(t))} change={change(avg(t), avg(y), formatMoney)} note="Updates as you sell" href="/billing/bills" />
          <StatCard label="Items Sold" value={String(t.items)} change={change(t.items, y.items, String)} note="Across all products" href="/billing/day-end" />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Get started</h2>
              <p className="mt-1 text-sm text-muted">
                {doneCount} of {checklist.length} done
              </p>
            </div>
            <span className="font-mono text-sm text-muted">{Math.round((doneCount / checklist.length) * 100)}%</span>
          </div>
          <ul className="mt-5 space-y-1">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-surface-2">
                  {item.done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted/60" />}
                  <span className={item.done ? "text-muted line-through" : "font-medium"}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold">Team</h2>
            {can(user.role, "team.manage") && (
              <Link href="/team" className="btn-outline h-10 px-4">
                <UserPlus className="h-4 w-4" /> Add staff
              </Link>
            )}
          </div>
          <ul className="mt-5 space-y-4">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="truncate text-sm text-muted">
                    {ROLE_LABELS[s.role]}
                    {s.lastLoginAt && <> · last in {s.lastLoginAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>}
                  </p>
                </div>
                {s.id === user.id ? (
                  <StatusPill tone="success">At counter</StatusPill>
                ) : s.active ? (
                  <StatusPill tone="primary">Active</StatusPill>
                ) : (
                  <StatusPill tone="neutral">Inactive</StatusPill>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card flex flex-col">
          <h2 className="text-2xl font-semibold">Monthly Target</h2>
          <p className="mt-1 text-sm text-muted">
            <span className="tabular font-semibold text-fg">{formatMoney(m.net)}</span>
            {target > 0 ? (
              <>
                {" "}
                of <span className="tabular">{formatMoney(target)}</span>
              </>
            ) : (
              " this month"
            )}
          </p>
          <div className="flex flex-1 items-center py-6">
            <Gauge percent={targetPct} label={target > 0 ? "of this month's target" : "no target set"} />
          </div>
          {target === 0 && can(user.role, "settings.manage") && (
            <Link href="/settings#billing" className="btn-ghost mb-2 h-11 self-center text-sm">
              Set a monthly target
            </Link>
          )}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-primary" /> Achieved
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border border-muted/50 bg-[repeating-linear-gradient(45deg,rgb(var(--muted)/0.5)_0_2px,transparent_2px_5px)]" />{" "}
              Remaining
            </span>
          </div>
        </section>
      </div>

      <section className="aura-pattern flex flex-col justify-between gap-6 rounded-card p-6 text-white sm:flex-row sm:items-end sm:p-8">
        <div>
          <p className="text-xl font-medium">Today</p>
          <div className="mt-4">
            <LiveClock />
          </div>
        </div>
        {can(user.role, "billing.use") && (
          <Link href="/billing" className="btn h-12 bg-white px-6 text-primary-strong hover:bg-white/90">
            <ReceiptText className="h-5 w-5" /> Open billing counter
          </Link>
        )}
      </section>
    </div>
  );
}
