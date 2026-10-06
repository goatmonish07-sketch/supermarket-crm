import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ClipboardList, Plus, Scissors } from "lucide-react";
import type { OrderKind, OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { dayRange, localDate } from "@/lib/dates";
import { KIND_LABEL, STATUS_LABEL, manualStages } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { OrderCard, type CardOrder } from "./order-card";

export const metadata = { title: "Orders & Jobs" };

const FILTERS = [
  { id: "", label: "All open" },
  { id: "today", label: "Due today" },
  { id: "overdue", label: "Overdue" },
  { id: "mine", label: "Mine" },
  { id: "hold", label: "On hold" },
  { id: "closed", label: "Delivered / cancelled" },
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ kind?: string; f?: string; q?: string; stage?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const manage = can(user.role, "orders.manage");
  if (!manage && !can(user.role, "jobs.update")) redirect("/dashboard?denied=1");
  // Tailors only ever see jobs assigned to them.
  const tailorOnly = !manage;
  const kind: OrderKind = tailorOnly ? "JOB" : sp.kind === "ORDER" ? "ORDER" : "JOB";
  const tz = user.store?.timezone ?? "Asia/Kolkata";
  const today = dayRange(localDate(new Date(), tz), tz);
  const f = sp.f ?? "";
  const q = sp.q?.trim();

  const where: Prisma.OrderWhereInput = {
    tenantId: user.tenantId,
    kind,
    status: f === "closed" ? { in: ["DELIVERED", "CANCELLED"] } : { notIn: ["DELIVERED", "CANCELLED"] },
    assigneeId: tailorOnly || f === "mine" ? user.id : undefined,
    onHold: f === "hold" ? true : undefined,
    dueDate: f === "today" ? { gte: today.start, lt: today.end } : f === "overdue" ? { lt: today.start } : undefined,
    OR: q
      ? [{ number: { contains: q, mode: "insensitive" } }, { customer: { name: { contains: q, mode: "insensitive" } } }, { customer: { phone: { contains: q.replace(/\D/g, "") || q } } }]
      : undefined,
  };
  const orders = await db.order.findMany({
    where,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: 300,
    include: { customer: { select: { name: true } }, assignee: { select: { name: true } }, items: { select: { description: true, qty: true } } },
  });

  const cards: CardOrder[] = orders.map((o) => ({
    id: o.id,
    number: o.number,
    kind: o.kind,
    status: o.status,
    onHold: o.onHold,
    customer: o.customer.name,
    summary: o.items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.description}` : i.description)).join(", "),
    due: o.dueDate ? o.dueDate.toLocaleDateString("en-IN", { timeZone: tz, day: "numeric", month: "short" }) : null,
    overdue: Boolean(o.dueDate && o.dueDate < today.start && o.status !== "DELIVERED" && o.status !== "CANCELLED"),
    dueToday: Boolean(o.dueDate && o.dueDate >= today.start && o.dueDate < today.end),
    assignee: o.assignee?.name ?? null,
    balance: o.status === "CANCELLED" ? 0 : Math.max(0, o.estimate - o.advancePaid),
  }));

  const stages = f === "closed" ? (["DELIVERED", "CANCELLED"] as OrderStatus[]) : manualStages(kind);
  const stageFilter = stages.includes(sp.stage as OrderStatus) ? (sp.stage as OrderStatus) : null;
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ kind, f: f || undefined, q, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/orders?${p.toString()}`;
  };
  const chip = (active: boolean) =>
    cn("flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium", active ? "border-fg bg-fg text-bg" : "border-border text-muted hover:text-fg");

  return (
    <div className="space-y-4">
      <PageHeader
        title={tailorOnly ? "My jobs" : "Orders & Jobs"}
        subtitle={`${cards.length} ${f === "closed" ? "closed" : "open"} ${kind === "JOB" ? "job" : "order"}${cards.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Link href="/orders/calendar" className="btn-ghost h-12">
              <CalendarDays className="h-4 w-4" aria-hidden="true" /> Calendar
            </Link>
            {manage && (
              <Link href={`/orders/new?kind=${kind}`} className="btn-primary h-12">
                <Plus className="h-4 w-4" aria-hidden="true" /> New {kind === "JOB" ? "job" : "order"}
              </Link>
            )}
          </>
        }
      />

      <section className="card space-y-4">
        {!tailorOnly && (
          <div role="tablist" aria-label="Kind" className="inline-flex rounded-full bg-surface-2 p-1">
            {(["JOB", "ORDER"] as OrderKind[]).map((k) => (
              <Link
                key={k}
                role="tab"
                aria-selected={kind === k}
                href={`/orders?kind=${k}`}
                className={cn("flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold", kind === k ? "bg-surface shadow-card" : "text-muted hover:text-fg")}
              >
                {k === "JOB" ? <Scissors className="h-4 w-4" aria-hidden="true" /> : <ClipboardList className="h-4 w-4" aria-hidden="true" />}
                {KIND_LABEL[k]}
              </Link>
            ))}
          </div>
        )}
        <form action="/orders" className="flex gap-2">
          <input type="hidden" name="kind" value={kind} />
          {f && <input type="hidden" name="f" value={f} />}
          <label className="flex-1">
            <span className="sr-only">Search</span>
            <input name="q" type="search" defaultValue={q} className="input" placeholder="Number, customer name or phone" />
          </label>
          <button className="btn-outline h-12">Search</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {FILTERS.filter((x) => !(tailorOnly && x.id === "mine")).map((x) => (
            <Link key={x.id} href={href({ f: x.id || undefined })} aria-current={f === x.id ? "true" : undefined} className={chip(f === x.id)}>
              {x.label}
            </Link>
          ))}
        </div>
      </section>

      {cards.length === 0 ? (
        <section className="card">
          <EmptyState icon={kind === "JOB" ? Scissors : ClipboardList} title="Nothing here" text={kind === "JOB" ? "Alteration and stitching jobs will appear here." : "Special orders and bookings will appear here."}>
            {manage && (
              <Link href={`/orders/new?kind=${kind}`} className="btn-primary h-12">
                <Plus className="h-4 w-4" aria-hidden="true" /> New {kind === "JOB" ? "job" : "order"}
              </Link>
            )}
          </EmptyState>
        </section>
      ) : (
        <>
          {/* Desktop board: columns scroll inside the board, never the page */}
          <div className="hidden overflow-x-auto pb-2 lg:block" role="region" aria-label="Board" tabIndex={0}>
            <div className="flex min-w-max gap-3">
              {stages.map((s) => {
                const col = cards.filter((c) => c.status === s);
                return (
                  <section key={s} className="w-[272px] shrink-0 rounded-card bg-surface-2/70 p-3" aria-label={STATUS_LABEL[s]}>
                    <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
                      {STATUS_LABEL[s]}
                      <span className="tabular rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{col.length}</span>
                    </h2>
                    <div className="space-y-2">
                      {col.map((c) => (
                        <OrderCard key={c.id} o={c} canMove={f !== "closed"} />
                      ))}
                      {col.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted">Empty</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {/* Mobile / tablet: stage chips + list */}
          <div className="space-y-3 lg:hidden">
            <div className="flex flex-wrap gap-2">
              <Link href={href({ stage: undefined })} className={chip(!stageFilter)}>
                All <span className="tabular ml-1">{cards.length}</span>
              </Link>
              {stages.map((s) => (
                <Link key={s} href={href({ stage: s })} className={chip(stageFilter === s)}>
                  {STATUS_LABEL[s]} <span className="tabular ml-1">{cards.filter((c) => c.status === s).length}</span>
                </Link>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {cards
                .filter((c) => !stageFilter || c.status === stageFilter)
                .map((c) => (
                  <div key={c.id}>
                    <p className="mb-1 px-1 text-xs font-medium text-muted">{STATUS_LABEL[c.status]}</p>
                    <OrderCard o={c} canMove={f !== "closed"} />
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
