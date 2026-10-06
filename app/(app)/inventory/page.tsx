import { requirePermission } from "@/lib/auth";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Inventory" };

export default async function Page() {
  await requirePermission("inventory.manage");
  return <ComingSoon title="Inventory" phase="Phase 2" items={["Live stock status pills", "Stock in & adjustments", "Low-stock alerts", "Stock count / audit", "Reorder suggestions", "Movement history"]} />;
}
