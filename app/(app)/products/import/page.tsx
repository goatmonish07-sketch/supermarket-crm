import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ImportFlow } from "./import-flow";

export const metadata = { title: "Import products" };

export default async function ImportPage() {
  await requirePermission("products.manage");
  return (
    <div className="space-y-4">
      <PageHeader title="Import products" subtitle="Bring your list from Excel in three steps." back={{ href: "/products", label: "Products" }} />
      <ImportFlow />
    </div>
  );
}
