import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, History, Plus, XCircle } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { available, colourSwatch, stockStatus, type StockStatus } from "@/lib/catalogue";
import { cn, formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StockPill } from "@/components/ui/stock-pill";
import { FilterBar } from "../products/filter-bar";
import { AdjustDialog } from "./adjust-dialog";

export const metadata = { title: "Inventory" };

const PAGE_SIZE = 40;
const STATUSES: { value: StockStatus; label: string }[] = [
  { value: "IN_STOCK", label: "In stock" },
  { value: "LOW", label: "Low stock" },
  { value: "OUT", label: "Out of stock" },
];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }> }) {
  const sp = await searchParams;
  const user = await requirePermission("inventory.manage");
  const showValue = can(user.role, "reports.profit");

  const where: Prisma.VariantWhereInput = {
    tenantId: user.tenantId,
    active: true,
    item: {
      active: true,
      type: { in: ["GOODS", "RENTAL"] },
      category: sp.category ? { name: sp.category } : undefined,
    },
    OR: sp.q
      ? [
          { item: { name: { contains: sp.q, mode: "insensitive" } } },
          { sku: { contains: sp.q, mode: "insensitive" } },
          { barcode: sp.q },
          { colour: { contains: sp.q, mode: "insensitive" } },
        ]
      : undefined,
  };

  const [variants, categories] = await Promise.all([
    db.variant.findMany({
      where,
      include: { item: { select: { id: true, name: true, type: true } } },
      orderBy: [{ item: { name: "asc" } }, { sortOrder: "asc" }],
    }),
    db.category.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  const all = variants.map((v) => ({ v, status: stockStatus(v.item.type, v), avail: available(v) }));
  const counts = { IN_STOCK: 0, LOW: 0, OUT: 0 } as Record<StockStatus, number>;
  let value = 0;
  for (const r of all) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    value += Math.max(0, r.v.onHand - r.v.damaged) * (r.v.cost ?? 0);
  }
  const rows = all.filter((r) => !sp.status || r.status === sp.status);
  const page = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (n: number) => `/inventory?${new URLSearchParams({ ...sp, page: String(n) } as Record<string, string>).toString()}`;

  const summary = [
    { key: "IN_STOCK", label: "In stock", icon: CheckCircle2, tone: "text-success" },
    { key: "LOW", label: "Low stock", icon: AlertTriangle, tone: "text-warning" },
    { key: "OUT", label: "Out of stock", icon: XCircle, tone: "text-danger" },
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader title="Inventory" subtitle="Stock for every size and colour." />

      <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", showValue ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {summary.map((s) => (
          <Link
            key={s.key}
            href={sp.status === s.key ? "/inventory" : `/inventory?status=${s.key}`}
            aria-pressed={sp.status === s.key}
            className={cn("card flex flex-col gap-3 transition hover:-translate-y-0.5", sp.status === s.key && "ring-2 ring-primary")}
          >
            <span className={cn("inline-flex items-center gap-2 text-sm font-medium", s.tone)}>
              <s.icon className="h-4 w-4" aria-hidden="true" /> {s.label}
            </span>
            <span className="tabular text-4xl font-bold">{counts[s.key]}</span>
            <span className="text-xs text-muted">variants</span>
          </Link>
        ))}
        {showValue && (
          <div className="card col-span-2 flex flex-col gap-3 bg-gradient-to-br from-primary to-primary-strong text-primary-fg lg:col-span-1">
            <span className="text-sm font-medium">Stock value (at cost)</span>
            <span className="tabular text-3xl font-bold sm:text-4xl">{formatMoney(value)}</span>
            <span className="text-xs text-primary-fg/80">Excludes damaged pieces</span>
          </div>
        )}
      </div>

      <section className="card">
        {all.length === 0 && !sp.q && !sp.category ? (
          <EmptyState icon={Boxes} title="No stock yet" text="Add products with sizes and colours, then manage their stock here.">
            <Link href="/products/new" className="btn-primary h-12">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add product
            </Link>
          </EmptyState>
        ) : (
          <>
            <FilterBar statuses={STATUSES} categories={categories.map((c) => c.name)} searchPlaceholder="Search product, colour, SKU or scan barcode" />
            {visible.length === 0 ? (
              <EmptyState icon={Boxes} title="Nothing matches" text="Try another search or clear the filters.">
                <Link href="/inventory" className="btn-outline h-11">
                  Clear filters
                </Link>
              </EmptyState>
            ) : (
              <ul className="mt-5 divide-y divide-border/60">
                {visible.map(({ v, status, avail }) => {
                  const label = [v.item.name, [v.size, v.colour].filter(Boolean).join(" / ")].filter(Boolean).join(" — ");
                  const swatch = colourSwatch(v.colour);
                  return (
                    <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                      <div className="min-w-0 flex-1 basis-56">
                        <Link href={`/products/${v.item.id}`} className="block truncate font-semibold hover:underline">
                          {v.item.name}
                        </Link>
                        <p className="flex items-center gap-2 truncate text-sm text-muted">
                          {swatch && <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ background: swatch }} aria-hidden="true" />}
                          {[v.size, v.colour].filter(Boolean).join(" / ") || "Standard"}
                          <span className="font-mono text-xs">· {v.sku}</span>
                        </p>
                      </div>
                      <dl className="flex gap-5 text-right text-sm">
                        <div>
                          <dt className="text-xs text-muted">Available</dt>
                          <dd className="tabular text-lg font-bold">{Math.max(0, avail)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">On hand</dt>
                          <dd className="tabular text-lg">{v.onHand}</dd>
                        </div>
                        {v.damaged > 0 && (
                          <div>
                            <dt className="text-xs text-muted">Damaged</dt>
                            <dd className="tabular text-lg text-danger">{v.damaged}</dd>
                          </div>
                        )}
                      </dl>
                      <div className="w-32">
                        <StockPill status={status} />
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/inventory/${v.id}`} className="btn-ghost h-11 w-11 p-0" aria-label={`Stock history for ${label}`}>
                          <History className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <AdjustDialog variantId={v.id} label={label} onHand={v.onHand} available={avail} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
              <p className="tabular">
                {rows.length} variant{rows.length === 1 ? "" : "s"}
                {pages > 1 && ` · page ${page} of ${pages}`}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={pageHref(page - 1)} className="btn-outline h-11">
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link href={pageHref(page + 1)} className="btn-outline h-11">
                    Next
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
