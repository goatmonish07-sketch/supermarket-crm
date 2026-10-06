import Link from "next/link";
import { ChevronRight, FileUp, Package, Plus, Tag } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ITEM_TYPES, ITEM_TYPE_LABEL, STOCK_STATUS_FILTERS, available, itemStockStatus, tracksStock, type StockStatus } from "@/lib/catalogue";
import { formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StockPill } from "@/components/ui/stock-pill";
import { FilterBar } from "./filter-bar";

export const metadata = { title: "Products & Services" };

const PAGE_SIZE = 25;

type Search = { q?: string; type?: string; status?: string; category?: string; archived?: string; page?: string };

function priceRange(prices: number[]) {
  if (!prices.length) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const user = await requirePermission("products.manage");
  const archived = sp.archived === "1";
  const typeFilter = ITEM_TYPES.some((t) => t.value === sp.type) ? (sp.type as Prisma.ItemWhereInput["type"]) : undefined;

  const where: Prisma.ItemWhereInput = {
    tenantId: user.tenantId,
    active: !archived,
    type: typeFilter,
    category: sp.category ? { name: sp.category } : undefined,
    OR: sp.q
      ? [
          { name: { contains: sp.q, mode: "insensitive" } },
          { brand: { contains: sp.q, mode: "insensitive" } },
          { variants: { some: { OR: [{ sku: { contains: sp.q, mode: "insensitive" } }, { barcode: sp.q }] } } },
        ]
      : undefined,
  };

  const [items, categories, totalItems] = await Promise.all([
    db.item.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { category: { select: { name: true } }, variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    db.category.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" }, select: { name: true } }),
    db.item.count({ where: { tenantId: user.tenantId } }),
  ]);

  const rows = items
    .map((item) => ({
      item,
      status: itemStockStatus(item.type, item.variants),
      qty: item.variants.reduce((sum, v) => sum + Math.max(0, available(v)), 0),
    }))
    .filter((r) => !sp.status || r.status === (sp.status as StockStatus));

  const page = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (n: number) => `/products?${new URLSearchParams({ ...sp, page: String(n) } as Record<string, string>).toString()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products & Services"
        subtitle={`${totalItems} item${totalItems === 1 ? "" : "s"} in your catalogue`}
        actions={
          <>
            <Link href="/products/labels" className="btn-ghost h-12">
              <Tag className="h-4 w-4" aria-hidden="true" /> Print labels
            </Link>
            <Link href="/products/import" className="btn-outline h-12">
              <FileUp className="h-4 w-4" aria-hidden="true" /> Import
            </Link>
            <Link href="/products/new" className="btn-primary h-12">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add product
            </Link>
          </>
        }
      />

      <section className="card">
        {totalItems === 0 ? (
          <EmptyState icon={Package} title="Your catalogue is empty" text="Add clothes, services like alterations, or import your list from Excel.">
            <Link href="/products/new" className="btn-primary h-12">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add first product
            </Link>
            <Link href="/products/import" className="btn-outline h-12">
              <FileUp className="h-4 w-4" aria-hidden="true" /> Import from Excel
            </Link>
          </EmptyState>
        ) : (
          <>
            <FilterBar
              types={ITEM_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              statuses={STOCK_STATUS_FILTERS}
              categories={categories.map((c) => c.name)}
              searchPlaceholder="Search name, brand, SKU or scan barcode"
            />

            {visible.length === 0 ? (
              <EmptyState icon={Package} title="Nothing matches" text="Try another search or clear the filters.">
                <Link href="/products" className="btn-outline h-11">
                  Clear filters
                </Link>
              </EmptyState>
            ) : (
              <>
                {/* Desktop table */}
                <table className="mt-6 hidden w-full text-left md:table">
                  <caption className="sr-only">Products</caption>
                  <thead className="text-xs font-semibold uppercase tracking-wide text-muted">
                    <tr className="border-b border-border/70">
                      <th scope="col" className="py-3 pr-3 font-semibold">Product</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Type</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">Variants</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">Price</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Stock</th>
                      <th scope="col" className="w-10 py-3"><span className="sr-only">Open</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(({ item, status, qty }) => (
                      <tr key={item.id} className="group relative border-b border-border/50 transition hover:bg-surface-2/70">
                        <td className="py-3 pr-3">
                          <Link href={`/products/${item.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                            <ItemTile name={item.name} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{item.name}</span>
                              <span className="block truncate text-sm text-muted">{[item.category?.name, item.brand].filter(Boolean).join(" · ") || "No category"}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-sm">{ITEM_TYPE_LABEL[item.type]}</td>
                        <td className="tabular px-3 py-3 text-right text-sm">{item.variants.length}</td>
                        <td className="tabular px-3 py-3 text-right text-sm font-medium">
                          {item.priceAtCounter ? "At counter" : priceRange(item.variants.map((v) => v.price))}
                        </td>
                        <td className="px-3 py-3">
                          <StockPill status={status} qty={tracksStock(item.type) ? qty : undefined} />
                        </td>
                        <td className="py-3 text-muted">
                          <ChevronRight className="h-5 w-5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile cards */}
                <ul className="mt-5 space-y-3 md:hidden">
                  {visible.map(({ item, status, qty }) => (
                    <li key={item.id}>
                      <Link href={`/products/${item.id}`} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3 transition active:bg-surface-2">
                        <ItemTile name={item.name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{item.name}</span>
                          <span className="tabular block text-sm text-muted">
                            {item.priceAtCounter ? "Price at counter" : priceRange(item.variants.map((v) => v.price))} · {item.variants.length} var.
                          </span>
                          <span className="mt-1.5 block">
                            <StockPill status={status} qty={tracksStock(item.type) ? qty : undefined} />
                          </span>
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
              <p className="tabular">
                {rows.length} result{rows.length === 1 ? "" : "s"}
                {pages > 1 && ` · page ${page} of ${pages}`}
              </p>
              <div className="flex gap-2">
                <Link href={archived ? "/products" : "/products?archived=1"} className="btn-ghost h-11">
                  {archived ? "Show active" : "Show archived"}
                </Link>
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

function ItemTile({ name }: { name: string }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-sm font-bold text-primary" aria-hidden="true">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
