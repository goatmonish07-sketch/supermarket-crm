import { notFound } from "next/navigation";
import type { ReceiptPaper } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Receipt } from "@/components/receipt/receipt";
import { SaleStatusPill } from "../status";
import { AutoPrint, BillActions } from "./bill-actions";

export const metadata = { title: "Bill" };

const PAPERS: ReceiptPaper[] = ["THERMAL_58", "THERMAL_80", "A5", "A4"];

export default async function BillPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string; paper?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requirePermission("billing.use");
  const sale = await db.sale.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "asc" } },
      customer: { select: { name: true, phone: true } },
      cashier: { select: { name: true } },
      store: true,
    },
  });
  if (!sale) notFound();
  const staff = await db.user.findMany({ where: { tenantId: user.tenantId, active: true, pinHash: { not: null } }, select: { id: true, name: true, role: true } });

  const paper = PAPERS.includes(sp.paper as ReceiptPaper) ? (sp.paper as ReceiptPaper) : sale.store.receiptPaper;
  const text = [
    `*${sale.store.name}*`,
    `Bill ${sale.number} · ${formatDateTime(sale.createdAt, sale.store.timezone)}`,
    ...sale.items.map((i) => `${i.qty} × ${i.name}${i.size || i.colour ? ` (${[i.size, i.colour].filter(Boolean).join("/")})` : ""} — ${formatMoney(i.total)}`),
    `*Total: ${formatMoney(sale.total)}*`,
    sale.total > sale.paidTotal ? `Balance due: ${formatMoney(sale.total - sale.paidTotal)}` : "Paid. Thank you!",
    sale.store.receiptFooter ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  const phone = sale.customer?.phone ? `91${sale.customer.phone}` : "";
  const whatsappHref = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  return (
    <div className="space-y-4">
      {sp.print === "1" && <AutoPrint />}
      <div className="print:hidden">
        <PageHeader
          title={sale.number}
          back={{ href: "/billing/bills", label: "Bills" }}
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-2">
              {formatDateTime(sale.createdAt, sale.store.timezone)} · <span className="tabular font-semibold text-fg">{formatMoney(sale.total)}</span>
              <SaleStatusPill status={sale.status} returnState={sale.returnState} />
            </span>
          }
        />
      </div>
      <div className="print:hidden">
        <BillActions
          saleId={sale.id}
          number={sale.number}
          paper={paper}
          whatsappHref={whatsappHref}
          cancelled={sale.status === "CANCELLED"}
          refundable={Math.max(0, sale.paidTotal - sale.refundedTotal)}
          approvers={staff.filter((s) => can(s.role, "billing.discount.override") && s.id !== user.id).map((s) => ({ id: s.id, name: s.name }))}
          lines={sale.items.map((i) => ({ id: i.id, name: i.name, variant: [i.size, i.colour].filter(Boolean).join(" / "), qty: i.qty, returnedQty: i.returnedQty, total: i.total }))}
        />
      </div>
      {sale.cancelReason && (
        <p className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger print:hidden">Cancelled: {sale.cancelReason}</p>
      )}
      <section className="card overflow-x-auto bg-surface-2 p-4 print:m-0 print:overflow-visible print:border-0 print:bg-white print:p-0 print:shadow-none" aria-label="Receipt preview">
        <div className="mx-auto w-fit min-w-0 rounded-xl shadow-card print:shadow-none" style={{ width: paper.startsWith("THERMAL") ? undefined : "100%" }}>
          <Receipt sale={sale} store={sale.store} paper={paper} />
        </div>
      </section>
    </div>
  );
}
