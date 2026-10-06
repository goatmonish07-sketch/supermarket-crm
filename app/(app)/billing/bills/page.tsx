import Link from "next/link";
import { ChevronRight, ReceiptText, Sunset } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { dayRange, formatDateTime, localDate } from "@/lib/dates";
import { cn, formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SaleStatusPill } from "./status";

export const metadata = { title: "Bills" };

const RANGES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All" },
] as const;
const STATUSES = [
  { id: "", label: "Any status" },
  { id: "due", label: "Balance due" },
  { id: "returned", label: "Returns" },
  { id: "cancelled", label: "Cancelled" },
] as const;
const PAGE_SIZE = 30;

export default async function BillsPage({ searchParams }: { searchParams: Promise<{ q?: string; range?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const user = await requirePermission("billing.use");
  const tz = user.store?.timezone ?? "Asia/Kolkata";
  const range = RANGES.some((r) => r.id === sp.range) ? sp.range! : "today";
  const today = dayRange(localDate(new Date(), tz), tz);
  const since = range === "today" ? today.start : range === "7d" ? new Date(today.start.getTime() - 6 * 86_400_000) : range === "30d" ? new Date(today.start.getTime() - 29 * 86_400_000) : undefined;
  const q = sp.q?.trim();
  const digits = q?.replace(/\D/g, "") ?? "";

  const where: Prisma.SaleWhereInput = {
    tenantId: user.tenantId,
    createdAt: since ? { gte: since } : undefined,
    status: sp.status === "cancelled" ? "CANCELLED" : sp.status === "due" ? { in: ["PARTLY_PAID", "UNPAID"] } : undefined,
    returnState: sp.status === "returned" ? { not: "NONE" } : undefined,
    OR: q
      ? [
          { number: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
          ...(digits.length >= 4 ? [{ customer: { phone: { contains: digits } } }] : []),
        ]
      : undefined,
  };
  const page = Math.max(1, Number(sp.page) || 1);
  const [sales, count, sums] = await Promise.all([
    db.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: { select: { name: true } }, _count: { select: { items: true } } },
    }),
    db.sale.count({ where }),
    db.sale.aggregate({ where: { ...where, status: where.status ?? { not: "CANCELLED" } }, _sum: { total: true, refundedTotal: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch, page: patch.page }).filter(([, v]) => v) as [string, string][]);
    return `/billing/bills?${p.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bills"
        subtitle={
          <>
            <span className="tabular">{count}</span> bill{count === 1 ? "" : "s"} · net{" "}
            <span className="tabular font-semibold text-fg">{formatMoney((sums._sum.total ?? 0) - (sums._sum.refundedTotal ?? 0))}</span>
          </>
        }
        back={{ href: "/billing", label: "Billing" }}
        actions={
          <Link href="/billing/day-end" className="btn-outline h-12">
            <Sunset className="h-4 w-4" aria-hidden="true" /> Day-end report
          </Link>
        }
      />
      <section className="card">
        <form className="flex flex-col gap-3 sm:flex-row" action="/billing/bills">
          <input type="hidden" name="range" value={range} />
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <label className="flex-1">
            <span className="sr-only">Search bills</span>
            <input name="q" type="search" defaultValue={q} className="input" placeholder="Bill number, customer name or phone" />
          </label>
          <button className="btn-outline h-12">Search</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Link key={r.id} href={href({ range: r.id })} aria-current={range === r.id ? "true" : undefined} className={cn("flex h-10 items-center rounded-full border px-4 text-sm font-medium", range === r.id ? "border-fg bg-fg text-bg" : "border-border text-muted hover:text-fg")}>
              {r.label}
            </Link>
          ))}
          <span className="mx-1 hidden w-px bg-border sm:block" aria-hidden="true" />
          {STATUSES.map((s) => (
            <Link key={s.id} href={href({ status: s.id || undefined })} aria-current={(sp.status ?? "") === s.id ? "true" : undefined} className={cn("flex h-10 items-center rounded-full border px-4 text-sm font-medium", (sp.status ?? "") === s.id ? "border-fg bg-fg text-bg" : "border-border text-muted hover:text-fg")}>
              {s.label}
            </Link>
          ))}
        </div>

        {sales.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No bills here" text={range === "today" ? "Bills made today will show up here." : "Try a wider date range or another search."}>
            <Link href="/billing" className="btn-primary h-12">
              New bill
            </Link>
          </EmptyState>
        ) : (
          <ul className="mt-5 divide-y divide-border/60">
            {sales.map((s) => (
              <li key={s.id}>
                <Link href={`/billing/bills/${s.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-2 py-3 transition hover:bg-surface-2">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-mono text-sm font-semibold">{s.number}</p>
                    <p className="truncate text-sm text-muted">
                      {formatDateTime(s.createdAt, tz)} · {s.customer?.name ?? "Walk-in"} · <span className="tabular">{s._count.items}</span> line{s._count.items === 1 ? "" : "s"}
                    </p>
                  </div>
                  <SaleStatusPill status={s.status} returnState={s.returnState} />
                  <span className={cn("tabular w-28 text-right text-lg font-bold", s.status === "CANCELLED" && "text-muted line-through")}>{formatMoney(s.total)}</span>
                  <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span className="tabular">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={href({ page: String(page - 1) })} className="btn-outline h-11">
                  Previous
                </Link>
              )}
              {page < pages && (
                <Link href={href({ page: String(page + 1) })} className="btn-outline h-11">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
