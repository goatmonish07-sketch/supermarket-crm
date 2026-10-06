import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { available, stockStatus } from "@/lib/catalogue";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StockPill } from "@/components/ui/stock-pill";
import { AdjustDialog } from "../adjust-dialog";

export const metadata = { title: "Stock history" };

const TYPE_LABEL: Record<string, string> = {
  OPENING: "Opening stock",
  STOCK_IN: "Stock in",
  STOCK_OUT: "Stock out",
  DAMAGED: "Marked damaged",
  COUNT_CORRECTION: "Count correction",
  SALE: "Sold",
  RETURN: "Customer return",
};

export default async function VariantHistoryPage({ params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  const user = await requirePermission("inventory.manage");
  const v = await db.variant.findFirst({
    where: { id: variantId, tenantId: user.tenantId },
    include: {
      item: { select: { name: true, type: true } },
      movements: { orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { name: true } } } },
    },
  });
  if (!v) notFound();
  const label = [v.item.name, [v.size, v.colour].filter(Boolean).join(" / ")].filter(Boolean).join(" — ");

  return (
    <div className="space-y-4">
      <PageHeader
        title={label}
        back={{ href: "/inventory", label: "Inventory" }}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{v.sku}</span>· <span className="tabular">{v.onHand}</span> on hand
            <StockPill status={stockStatus(v.item.type, v)} qty={Math.max(0, available(v))} />
          </span>
        }
        actions={<AdjustDialog variantId={v.id} label={label} onHand={v.onHand} available={available(v)} />}
      />
      <section className="card">
        <h2 className="text-xl font-semibold">Movement history</h2>
        {v.movements.length === 0 ? (
          <EmptyState icon={History} title="No movements yet" text="Stock changes, sales and returns will appear here." />
        ) : (
          <ol className="mt-4 divide-y divide-border/60">
            {v.movements.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span
                  className={cn(
                    "tabular w-16 text-right text-lg font-bold",
                    m.type === "DAMAGED" ? "text-danger" : m.qty > 0 ? "text-success" : m.qty < 0 ? "text-danger" : "text-muted",
                  )}
                >
                  {m.type === "DAMAGED" ? `−${m.qty}` : m.qty > 0 ? `+${m.qty}` : m.qty}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {TYPE_LABEL[m.type] ?? m.type}
                    {m.reason && <span className="font-normal text-muted"> · {m.reason}</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {m.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                    {m.user && ` · ${m.user.name}`}
                  </p>
                </div>
                <span className="tabular text-sm text-muted">Balance {m.balanceAfter}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
