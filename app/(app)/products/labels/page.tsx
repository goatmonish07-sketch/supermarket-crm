import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { LabelSheet } from "./label-sheet";

export const metadata = { title: "Print labels" };

export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const user = await requirePermission("products.manage");
  const idList = ids?.split(",").filter(Boolean).slice(0, 300);

  const variants = await db.variant.findMany({
    where: {
      tenantId: user.tenantId,
      active: true,
      id: idList?.length ? { in: idList } : undefined,
      item: { active: true, type: { in: ["GOODS", "RENTAL"] } },
    },
    include: { item: { select: { name: true } } },
    orderBy: [{ item: { name: "asc" } }, { sortOrder: "asc" }],
    take: 300,
  });

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <PageHeader
          title="Print labels"
          subtitle={idList?.length ? `${variants.length} variant${variants.length === 1 ? "" : "s"} selected` : "All products with stock (first 300)."}
          back={{ href: "/products", label: "Products" }}
        />
      </div>
      <LabelSheet
        shopName={user.store?.name ?? user.tenant.name}
        variants={variants.map((v) => ({
          id: v.id,
          name: v.item.name,
          size: v.size,
          colour: v.colour,
          sku: v.sku,
          barcode: v.barcode,
          price: v.price,
          mrp: v.mrp,
          onHand: v.onHand,
        }))}
      />
    </div>
  );
}
