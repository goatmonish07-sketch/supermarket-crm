import { requirePermission } from "@/lib/auth";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Orders & Jobs" };

const ITEMS = [
  "Customer orders with status board",
  "Alteration & stitching job cards",
  "Measurements per customer",
  "Advance & balance payments",
  "Delivery calendar",
  "WhatsApp “ready for pickup” alerts",
];

export default async function Page() {
  await requirePermission("orders.manage");
  return <ComingSoon title="Orders & Jobs" phase="Phase 4" items={ITEMS} />;
}
