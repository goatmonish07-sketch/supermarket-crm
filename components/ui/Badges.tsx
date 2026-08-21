import clsx from "clsx";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "badge-success",
    PARTIAL: "badge-warning",
    DUE: "badge-danger",
  };
  return <span className={map[status] || "badge-muted"}>{titleCase(status)}</span>;
}

export function PaymentBadge({ mode }: { mode: string }) {
  const map: Record<string, string> = {
    CASH: "badge-success",
    UPI: "badge-violet",
    CARD: "badge-muted",
    CREDIT: "badge-warning",
  };
  return <span className={map[mode] || "badge-muted"}>{titleCase(mode)}</span>;
}

export function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock <= 0) return <span className="badge-danger">Out of stock</span>;
  if (stock <= threshold) return <span className="badge-warning">Low</span>;
  return <span className="badge-success">In stock</span>;
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={clsx("badge", role === "ADMIN" ? "badge-violet" : "badge-muted")}>
      {role === "ADMIN" ? "Admin" : "Cashier"}
    </span>
  );
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
