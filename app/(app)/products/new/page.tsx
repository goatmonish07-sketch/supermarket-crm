import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ProductEditor } from "../product-editor";
import { emptyItem } from "../editor-data";

export const metadata = { title: "Add product" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const user = await requirePermission("products.manage");
  const categories = await db.category.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" }, select: { name: true } });
  const initial = { ...emptyItem, type: type === "SERVICE" ? ("SERVICE" as const) : emptyItem.type };

  return (
    <div className="space-y-4">
      <PageHeader title="Add product" subtitle="Goods, services, rentals or other charges." back={{ href: "/products", label: "Products" }} />
      <ProductEditor initial={initial} categories={categories.map((c) => c.name)} />
    </div>
  );
}
