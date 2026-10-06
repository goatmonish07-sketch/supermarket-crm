import type { Customer, Payment, ReceiptPaper, Sale, SaleItem, Store, User } from "@prisma/client";
import { PAYMENT_LABEL } from "@/lib/billing";
import { formatDateTime } from "@/lib/dates";
import { cn, formatMoney } from "@/lib/utils";

export type ReceiptSale = Sale & {
  items: SaleItem[];
  payments: Payment[];
  customer: Pick<Customer, "name" | "phone"> | null;
  cashier: Pick<User, "name"> | null;
};

const PAPER: Record<ReceiptPaper, { page: string; width: string; thermal: boolean }> = {
  THERMAL_58: { page: "58mm auto", width: "48mm", thermal: true },
  THERMAL_80: { page: "80mm auto", width: "72mm", thermal: true },
  A5: { page: "A5", width: "100%", thermal: false },
  A4: { page: "A4", width: "100%", thermal: false },
};

const m = (p: number) => formatMoney(p);

function taxRows(items: SaleItem[]) {
  const rows = new Map<number, { rate: number; taxable: number; tax: number }>();
  for (const i of items) {
    const r = rows.get(i.taxRateBp) ?? { rate: i.taxRateBp, taxable: 0, tax: 0 };
    r.taxable += i.taxable;
    r.tax += i.tax;
    rows.set(i.taxRateBp, r);
  }
  return [...rows.values()].sort((a, b) => a.rate - b.rate);
}

/** Printable bill. The on-screen preview is exactly what prints. */
export function Receipt({ sale, store, paper }: { sale: ReceiptSale; store: Store; paper: ReceiptPaper }) {
  const P = PAPER[paper];
  const taxes = taxRows(sale.items);
  const payments = sale.payments.filter((p) => p.amount > 0);
  const refunds = sale.payments.filter((p) => p.amount < 0);
  const due = sale.total - sale.paidTotal;
  const saved = sale.discountTotal;
  const address = [store.address, [store.city, store.state, store.pincode].filter(Boolean).join(", ")].filter(Boolean);
  const title = store.gstin ? "TAX INVOICE" : "BILL";
  const cancelled = sale.status === "CANCELLED";

  return (
    <>
      <style>{`@media print { @page { size: ${P.page}; margin: ${P.thermal ? "2mm" : "10mm"}; } }`}</style>
      <article
        className={cn(
          "relative mx-auto bg-white text-black",
          P.thermal ? "px-[2mm] py-[3mm] font-mono text-[11px] leading-[1.35]" : "p-8 text-[12px] leading-relaxed print:p-0",
        )}
        style={{ width: P.thermal ? P.width : undefined, maxWidth: P.thermal ? undefined : paper === "A5" ? "148mm" : "210mm" }}
        aria-label={`Bill ${sale.number}`}
      >
        {cancelled && (
          <p className="pointer-events-none absolute inset-0 flex rotate-[-20deg] items-center justify-center text-5xl font-black tracking-widest text-red-600/25">CANCELLED</p>
        )}

        <header className={cn("text-center", !P.thermal && "flex items-start justify-between text-left")}>
          <div>
            <p className={cn("font-bold uppercase", P.thermal ? "text-[14px]" : "text-2xl normal-case")}>{store.name}</p>
            {address.map((a) => (
              <p key={a}>{a}</p>
            ))}
            {store.phone && <p>Ph: {store.phone}</p>}
            {store.gstin && <p>GSTIN: {store.gstin}</p>}
          </div>
          {!P.thermal && (
            <div className="text-right">
              <p className="text-lg font-bold tracking-wide">{title}</p>
              <p>
                No. <strong>{sale.number}</strong>
              </p>
              <p>{formatDateTime(sale.createdAt, store.timezone)}</p>
            </div>
          )}
        </header>

        {P.thermal ? (
          <>
            <p className="my-1.5 border-y border-dashed border-black py-0.5 text-center font-bold">{title}</p>
            <p className="flex justify-between">
              <span>Bill: {sale.number.split("/").pop()}</span>
              <span>{formatDateTime(sale.createdAt, store.timezone)}</span>
            </p>
            <p className="truncate">No: {sale.number}</p>
            {sale.cashier && <p>Cashier: {sale.cashier.name}</p>}
            {sale.customer && (
              <p>
                Customer: {sale.customer.name} ({sale.customer.phone})
              </p>
            )}
            <div className="my-1.5 border-t border-dashed border-black" />
            <ul>
              {sale.items.map((i) => (
                <li key={i.id} className="mb-1">
                  <p className="font-semibold">
                    {i.name}
                    {(i.size || i.colour) && <span className="font-normal"> ({[i.size, i.colour].filter(Boolean).join("/")})</span>}
                  </p>
                  <p className="flex justify-between">
                    <span>
                      {i.qty} × {m(i.unitPrice)}
                    </span>
                    <span>{m(i.unitPrice * i.qty)}</span>
                  </p>
                  {i.lineDiscount > 0 && (
                    <p className="flex justify-between">
                      <span>  Discount</span>
                      <span>-{m(i.lineDiscount)}</span>
                    </p>
                  )}
                  {i.returnedQty > 0 && <p>  Returned: {i.returnedQty}</p>}
                  {i.note && <p className="italic">  {i.note}</p>}
                </li>
              ))}
            </ul>
            <div className="my-1.5 border-t border-dashed border-black" />
          </>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-black/20 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-black/60">Bill to</p>
                <p className="font-semibold">{sale.customer?.name ?? "Walk-in customer"}</p>
                {sale.customer && <p>{sale.customer.phone}</p>}
              </div>
              <div className="text-right">
                {sale.cashier && <p>Cashier: {sale.cashier.name}</p>}
                <p>Place of supply: {store.state ?? "—"}</p>
              </div>
            </div>
            <table className="mt-4 w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-black text-[10px] uppercase tracking-wide">
                  <th className="py-1.5 pr-2">#</th>
                  <th className="py-1.5 pr-2">Item</th>
                  <th className="py-1.5 pr-2">HSN/SAC</th>
                  <th className="py-1.5 pr-2 text-right">Qty</th>
                  <th className="py-1.5 pr-2 text-right">Rate</th>
                  <th className="py-1.5 pr-2 text-right">Disc.</th>
                  <th className="py-1.5 pr-2 text-right">Taxable</th>
                  <th className="py-1.5 pr-2 text-right">GST</th>
                  <th className="py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((i, n) => (
                  <tr key={i.id} className="border-b border-black/15 align-top">
                    <td className="py-1.5 pr-2">{n + 1}</td>
                    <td className="py-1.5 pr-2">
                      <p className="font-medium">{i.name}</p>
                      {(i.size || i.colour) && <p className="text-black/70">{[i.size, i.colour].filter(Boolean).join(" / ")}</p>}
                      {i.returnedQty > 0 && <p className="text-black/70">Returned: {i.returnedQty}</p>}
                    </td>
                    <td className="py-1.5 pr-2">{i.taxCode ?? ""}</td>
                    <td className="py-1.5 pr-2 text-right">{i.qty}</td>
                    <td className="py-1.5 pr-2 text-right">{m(i.unitPrice)}</td>
                    <td className="py-1.5 pr-2 text-right">{i.lineDiscount ? m(i.lineDiscount) : "—"}</td>
                    <td className="py-1.5 pr-2 text-right">{m(i.taxable)}</td>
                    <td className="py-1.5 pr-2 text-right">{i.taxRateBp / 100}%</td>
                    <td className="py-1.5 text-right font-medium">{m(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className={cn(!P.thermal && "mt-4 grid grid-cols-2 gap-6")}>
          {!P.thermal && (
            <table className="h-fit w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-black/30">
                  <th className="py-1">GST</th>
                  <th className="py-1 text-right">Taxable</th>
                  <th className="py-1 text-right">CGST</th>
                  <th className="py-1 text-right">SGST</th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((t) => (
                  <tr key={t.rate}>
                    <td className="py-0.5">{t.rate / 100}%</td>
                    <td className="py-0.5 text-right">{m(t.taxable)}</td>
                    <td className="py-0.5 text-right">{m(Math.floor(t.tax / 2))}</td>
                    <td className="py-0.5 text-right">{m(t.tax - Math.floor(t.tax / 2))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <dl className="space-y-0.5">
            <Row label="Total MRP value" value={m(sale.grossTotal)} />
            {sale.discountTotal > 0 && <Row label="Discount" value={`-${m(sale.discountTotal)}`} />}
            <Row label="Taxable value" value={m(sale.taxableTotal)} />
            {P.thermal &&
              taxes.map((t) => (
                <Row key={t.rate} label={`CGST+SGST ${t.rate / 100}%`} value={m(t.tax)} />
              ))}
            {!P.thermal && <Row label="GST" value={m(sale.taxTotal)} />}
            {sale.roundOff !== 0 && <Row label="Round off" value={m(sale.roundOff)} />}
            <div className={cn("flex justify-between border-y border-black py-1 font-bold", P.thermal ? "my-1 text-[14px]" : "my-2 text-lg")}>
              <dt>TOTAL</dt>
              <dd>{m(sale.total)}</dd>
            </div>
            {payments.map((p) => (
              <Row key={p.id} label={`Paid · ${PAYMENT_LABEL[p.method]}${p.reference ? ` (${p.reference})` : ""}`} value={m(p.amount)} />
            ))}
            {sale.changeGiven > 0 && <Row label="Change returned" value={m(sale.changeGiven)} />}
            {due > 0 && !cancelled && <Row label="BALANCE DUE" value={m(due)} bold />}
            {refunds.map((p) => (
              <Row key={p.id} label={`${p.reference ?? "Refund"} · ${PAYMENT_LABEL[p.method]}`} value={m(p.amount)} />
            ))}
          </dl>
        </div>

        {saved > 0 && !cancelled && (
          <p className={cn("text-center font-bold", P.thermal ? "mt-2" : "mt-4 text-sm")}>You saved {m(saved)} today!</p>
        )}
        <footer className={cn("text-center", P.thermal ? "mt-2 border-t border-dashed border-black pt-1.5" : "mt-8 border-t border-black/20 pt-3 text-[11px]")}>
          {store.returnPolicy && <p>{store.returnPolicy}</p>}
          {store.receiptFooter && <p className="mt-1 font-semibold">{store.receiptFooter}</p>}
          {!P.thermal && <p className="mt-6 text-right">For {store.name}</p>}
        </footer>
      </article>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-2", bold && "font-bold")}>
      <dt>{label}</dt>
      <dd className="whitespace-nowrap">{value}</dd>
    </div>
  );
}
