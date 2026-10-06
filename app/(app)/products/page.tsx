import { requirePermission } from "@/lib/auth";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Products & Services" };

export default async function Page() {
  await requirePermission("products.manage");
  return <ComingSoon title="Products & Services" phase="Phase 2" items={["Goods, services, rentals, combos", "Size × colour variant matrix", "Barcodes & label printing", "HSN/SAC & GST rates", "Excel import/export", "Collections & seasons"]} />;
}
