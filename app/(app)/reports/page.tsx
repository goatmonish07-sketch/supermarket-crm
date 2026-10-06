import { requirePermission } from "@/lib/auth";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Reports" };

export default async function Page() {
  await requirePermission("reports.view");
  return <ComingSoon title="Reports" phase="Phase 5" items={["Daily & monthly sales", "By product, size, colour, staff", "GST / HSN summary", "Stock valuation", "Profit report", "Excel & PDF export"]} />;
}
