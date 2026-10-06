import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import type { StockStatus } from "@/lib/catalogue";
import { StatusPill, type PillTone } from "./status-pill";

const MAP: Record<StockStatus, { tone: PillTone; label: string; Icon: typeof CheckCircle2 }> = {
  IN_STOCK: { tone: "success", label: "In stock", Icon: CheckCircle2 },
  LOW: { tone: "warning", label: "Low stock", Icon: AlertTriangle },
  OUT: { tone: "danger", label: "Out of stock", Icon: XCircle },
  NO_STOCK: { tone: "neutral", label: "No stock", Icon: MinusCircle },
};

/** Stock status = colour + icon + text (never colour alone). */
export function StockPill({ status, qty }: { status: StockStatus; qty?: number }) {
  const { tone, label, Icon } = MAP[status];
  return (
    <StatusPill tone={tone} className="gap-1">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      {qty !== undefined && status !== "NO_STOCK" && <span className="tabular font-semibold">· {qty}</span>}
    </StatusPill>
  );
}
