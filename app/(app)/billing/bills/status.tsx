import type { ReturnState, SaleStatus } from "@prisma/client";
import { StatusPill } from "@/components/ui/status-pill";

export function SaleStatusPill({ status, returnState }: { status: SaleStatus; returnState: ReturnState }) {
  if (status === "CANCELLED") return <StatusPill tone="danger">Cancelled</StatusPill>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {status === "PAID" && <StatusPill tone="success">Paid</StatusPill>}
      {status === "PARTLY_PAID" && <StatusPill tone="warning">Part paid</StatusPill>}
      {status === "UNPAID" && <StatusPill tone="warning">Unpaid</StatusPill>}
      {returnState === "PARTLY_RETURNED" && <StatusPill tone="info">Part returned</StatusPill>}
      {returnState === "RETURNED" && <StatusPill tone="info">Returned</StatusPill>}
    </span>
  );
}
