import { requirePermission } from "@/lib/auth";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Customers" };

export default async function Page() {
  await requirePermission("customers.manage");
  return <ComingSoon title="Customers" phase="Phase 3" items={["Phone lookup at billing", "Purchase history", "Measurements", "Loyalty points", "Dues / khata", "Birthdays & anniversaries"]} />;
}
