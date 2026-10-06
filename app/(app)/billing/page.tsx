import { requirePermission } from "@/lib/auth";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Billing" };

export default async function Page() {
  await requirePermission("billing.use");
  return <ComingSoon title="Billing" phase="Phase 3" items={["Barcode scan & quick search", "Goods + services in one cart", "Hold / resume bills", "Split payment: cash, card, UPI", "GST & round-off", "Print 58/80 mm, A4, A5", "Returns & exchanges", "WhatsApp bill"]} />;
}
