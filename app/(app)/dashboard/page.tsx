import Link from "next/link";
import { CheckCircle2, Circle, PackagePlus, Plus, ReceiptText, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { formatMoney } from "@/lib/utils";
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
  const staffCount = await db.user.count({ where: { tenantId: user.tenantId } });

  const store = user.store;
  const checklist = [
    { label: "Add shop address & GSTIN", done: Boolean(store?.address && store?.gstin), href: "/settings" },
    { label: "Pick your theme", done: user.theme !== "emerald" || user.themeMode !== "SYSTEM", href: "/settings" },
    { label: "Add a staff member", done: staffCount > 1, href: "/team" },
    { label: "Add products & services", done: false, href: "/products" },
    { label: "Make your first bill", done: false, href: "/billing" },
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
          <div className="mb-6 rounded-2xl bg-primary-soft px-4 py-3 text-sm">
            🎉 Your shop is ready. Your <strong>Shop ID</strong> for logging in is{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono font-semibold">{user.tenant.slug}</code>.
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
            <Link href="/products" className="btn-outline h-14 px-6 text-base">
              <PackagePlus className="h-5 w-5" /> Add Product
            </Link>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard featured label="Today's Sales" value={formatMoney(0)} note="Starts with your first bill" href="/reports" />
          <StatCard label="Bills Today" value="0" note="No bills yet" href="/billing" />
          <StatCard label="Avg. Bill Value" value={formatMoney(0)} note="Updates as you sell" href="/reports" />
          <StatCard label="Items Sold" value="0" note="Across all products" href="/reports" />
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
          <div className="flex flex-1 items-center py-6">
            <Gauge percent={0} label="of this month's target" />
          </div>
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
