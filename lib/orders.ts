import type { OrderKind, OrderStatus } from "@prisma/client";
import type { PillTone } from "@/components/ui/status-pill";

// Stage order for each kind. CANCELLED is reachable from any open stage.
export const FLOWS: Record<OrderKind, OrderStatus[]> = {
  JOB: ["RECEIVED", "MEASURED", "CUTTING", "STITCHING", "TRIAL", "READY", "DELIVERED"],
  ORDER: ["CONFIRMED", "AWAITING_STOCK", "IN_ALTERATION", "READY", "OUT_FOR_DELIVERY", "DELIVERED"],
};

export const KIND_LABEL: Record<OrderKind, string> = { ORDER: "Customer order", JOB: "Alteration / stitching" };

export const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED: "Received",
  MEASURED: "Measured",
  CUTTING: "Cutting",
  STITCHING: "Stitching",
  TRIAL: "Trial / fitting",
  CONFIRMED: "Confirmed",
  AWAITING_STOCK: "Awaiting stock",
  IN_ALTERATION: "In alteration",
  OUT_FOR_DELIVERY: "Out for delivery",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const STATUS_TONE: Record<OrderStatus, PillTone> = {
  RECEIVED: "neutral",
  MEASURED: "info",
  CUTTING: "info",
  STITCHING: "primary",
  TRIAL: "warning",
  CONFIRMED: "info",
  AWAITING_STOCK: "warning",
  IN_ALTERATION: "primary",
  OUT_FOR_DELIVERY: "primary",
  READY: "success",
  DELIVERED: "neutral",
  CANCELLED: "danger",
};

/** Open stages a user may move to by hand. DELIVERED happens through billing; CANCELLED through cancel. */
export function manualStages(kind: OrderKind): OrderStatus[] {
  return FLOWS[kind].filter((s) => s !== "DELIVERED");
}

export function nextStage(kind: OrderKind, status: OrderStatus): OrderStatus | null {
  const flow = manualStages(kind);
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

export function isOpen(status: OrderStatus) {
  return status !== "DELIVERED" && status !== "CANCELLED";
}

export const MEASUREMENT_TEMPLATES: Record<string, string[]> = {
  Blouse: ["Bust", "Under bust", "Waist", "Shoulder", "Armhole", "Sleeve length", "Sleeve round", "Front neck depth", "Back neck depth", "Blouse length"],
  Kurti: ["Bust", "Waist", "Hip", "Shoulder", "Armhole", "Sleeve length", "Sleeve round", "Front neck depth", "Back neck depth", "Kurti length"],
  "Salwar / Pant": ["Waist", "Hip", "Thigh", "Knee", "Calf", "Bottom", "Length"],
  Lehenga: ["Waist", "Hip", "Length", "Flare"],
  "Men's shirt": ["Chest", "Waist", "Shoulder", "Sleeve length", "Collar", "Shirt length"],
};

export type MeasurementValues = Record<string, number>;

/** Ready-to-send WhatsApp text for a status update. */
export function statusMessage(o: { number: string; kind: OrderKind; status: OrderStatus; customerName: string; dueDate?: Date | null; balance: number }, shopName: string, fmtMoney: (p: number) => string) {
  const hi = `Hello ${o.customerName.split(" ")[0]},`;
  const due = o.balance > 0 ? ` Balance to pay: ${fmtMoney(o.balance)}.` : "";
  const what = o.kind === "JOB" ? "your stitching/alteration" : "your order";
  switch (o.status) {
    case "READY":
      return `${hi} ${what} ${o.number} is ready for pickup at ${shopName}.${due} Thank you!`;
    case "TRIAL":
      return `${hi} ${what} ${o.number} is ready for a trial fitting at ${shopName}. Please visit at your convenience.`;
    case "OUT_FOR_DELIVERY":
      return `${hi} ${what} ${o.number} from ${shopName} is out for delivery today.${due}`;
    case "AWAITING_STOCK":
      return `${hi} we're arranging stock for ${what} ${o.number}. We'll update you soon. — ${shopName}`;
    case "DELIVERED":
      return `${hi} thank you for collecting ${o.number} from ${shopName}. We hope you love it!`;
    case "CANCELLED":
      return `${hi} ${what} ${o.number} at ${shopName} has been cancelled.`;
    default:
      return `${hi} update on ${what} ${o.number}: ${STATUS_LABEL[o.status]}.${o.dueDate ? ` Expected by ${o.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.` : ""} — ${shopName}`;
  }
}
