import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Boxes, CheckCircle2, Tag } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ITEM_TYPE_LABEL, itemStockStatus, tracksStock } from "@/lib/catalogue";
import { PageHeader } from "@/components/ui/page-header";
import { StockPill } from "@/components/ui/stock-pill";
import { ProductEditor } from "../product-editor";
import { toEditorItem } from "../editor-data";
import { setProductActiveAction } from "../actions";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const user = await requirePermission("products.manage");
  const [item, categories] = await Promise.all([
    db.item.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { category: true, variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    db.category.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  if (!item) notFound();

  const ids = item.variants.map((v) => v.id).join(",");

  return (
    <div className="space-y-4">
      <PageHeader
        title={item.name}
        back={{ href: "/products", label: "Products" }}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {ITEM_TYPE_LABEL[item.type]} · {item.variants.length} variant{item.variants.length === 1 ? "" : "s"}
            <StockPill status={itemStockStatus(item.type, item.variants)} />
            {!item.active && <span className="font-medium text-warning">Archived</span>}
          </span>
        }
        actions={
          <>
            {tracksStock(item.type) && (
              <>
                <Link href={`/products/labels?ids=${ids}`} className="btn-ghost h-12">
                  <Tag className="h-4 w-4" aria-hidden="true" /> Labels
                </Link>
                <Link href={`/inventory?q=${encodeURIComponent(item.name)}`} className="btn-outline h-12">
                  <Boxes className="h-4 w-4" aria-hidden="true" /> Adjust stock
                </Link>
              </>
            )}
            <form action={setProductActiveAction}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="active" value={String(!item.active)} />
              <button className={item.active ? "btn-danger h-12" : "btn-outline h-12"}>
                {item.active ? <Archive className="h-4 w-4" aria-hidden="true" /> : <ArchiveRestore className="h-4 w-4" aria-hidden="true" />}
                {item.active ? "Archive" : "Restore"}
              </button>
            </form>
          </>
        }
      />
      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> Saved. Barcodes and SKUs were filled in automatically where left empty.
        </p>
      )}
      <ProductEditor key={item.updatedAt.toISOString()} initial={toEditorItem(item)} categories={categories.map((c) => c.name)} />
    </div>
  );
}
