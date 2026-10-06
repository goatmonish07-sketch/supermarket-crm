import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/dates";
import { KIND_LABEL } from "@/lib/orders";
import { cn, formatMoney } from "@/lib/utils";
import { Barcode } from "@/components/ui/barcode";
import { PrintButton } from "@/app/(app)/billing/day-end/print-button";

export const metadata = { title: "Job slip" };

export default async function SlipPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paper?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const manage = can(user.role, "orders.manage");
  if (!manage && !can(user.role, "jobs.update")) redirect("/dashboard?denied=1");
  const order = await db.order.findFirst({
    where: { id, tenantId: user.tenantId, ...(manage ? {} : { assigneeId: user.id }) },
    include: { customer: true, items: true, assignee: { select: { name: true } }, store: true },
  });
  if (!order) notFound();
  const a5 = sp.paper === "A5";
  const tz = order.store.timezone;
  const day = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—");
  const snapshot = order.measurementSnapshot as { label: string; values: Record<string, number>; notes?: string | null } | null;
  const balance = Math.max(0, order.estimate - order.advancePaid);

  const copy = (workshop: boolean) => (
    <article
      className={cn(
        "break-inside-avoid bg-white text-black",
        a5 ? "mx-auto w-full max-w-[148mm] p-6 text-[12px]" : "mx-auto w-[72mm] px-[2mm] py-[3mm] font-mono text-[11px] leading-[1.35]",
        workshop && "print:break-before-page",
      )}
    >
      <p className="text-center text-[10px] font-bold uppercase tracking-widest">{workshop ? "Workshop copy" : "Customer copy"}</p>
      <p className="mt-1 text-center text-[14px] font-bold">{order.store.name}</p>
      {!workshop && order.store.phone && <p className="text-center">Ph: {order.store.phone}</p>}
      <div className="my-2 border-t border-dashed border-black" />
      <p className="text-center font-semibold">{KIND_LABEL[order.kind]}</p>
      <div className="mx-auto my-1 w-[90%]">
        <Barcode value={order.number} height={40} />
      </div>
      <p>Date: {formatDateTime(order.createdAt, tz)}</p>
      <p>
        Customer: {order.customer.name} ({order.customer.phone})
      </p>
      <p className="font-bold">Due: {day(order.dueDate)}</p>
      {order.trialDate && <p>Trial: {day(order.trialDate)}</p>}
      {workshop && order.assignee && <p>Tailor: {order.assignee.name}</p>}
      <div className="my-2 border-t border-dashed border-black" />
      <ul>
        {order.items.map((i) => (
          <li key={i.id} className="mb-1">
            <p className="flex justify-between gap-2">
              <span>
                {i.qty} × {i.description}
              </span>
              {!workshop && <span>{formatMoney(i.price * i.qty)}</span>}
            </p>
            {i.note && <p className="italic">  {i.note}</p>}
          </li>
        ))}
      </ul>
      {workshop && snapshot && (
        <>
          <div className="my-2 border-t border-dashed border-black" />
          <p className="font-bold">Measurements · {snapshot.label} (inches)</p>
          <dl className="grid grid-cols-2 gap-x-3">
            {Object.entries(snapshot.values).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt>{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {snapshot.notes && <p className="italic">{snapshot.notes}</p>}
        </>
      )}
      {workshop && order.designNotes && (
        <>
          <div className="my-2 border-t border-dashed border-black" />
          <p className="font-bold">Design notes</p>
          <p className="whitespace-pre-line">{order.designNotes}</p>
        </>
      )}
      {!workshop && (
        <>
          <div className="my-2 border-t border-dashed border-black" />
          <p className="flex justify-between">
            <span>Estimate</span>
            <span>{formatMoney(order.estimate)}</span>
          </p>
          <p className="flex justify-between">
            <span>Advance paid</span>
            <span>{formatMoney(order.advancePaid)}</span>
          </p>
          <p className="flex justify-between font-bold">
            <span>Balance on delivery</span>
            <span>{formatMoney(balance)}</span>
          </p>
          <p className="mt-2 text-center">Please bring this slip when collecting.</p>
        </>
      )}
    </article>
  );

  return (
    <div className="space-y-4">
      <style>{`@media print { @page { size: ${a5 ? "A5" : "80mm auto"}; margin: ${a5 ? "8mm" : "2mm"}; } }`}</style>
      <div className="card flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/orders/${order.id}`} className="btn-ghost h-12">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {order.number}
        </Link>
        <div className="ml-auto flex rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Paper">
          {[
            ["", "80 mm"],
            ["A5", "A5"],
          ].map(([v, label]) => (
            <Link
              key={label}
              role="radio"
              aria-checked={(sp.paper ?? "") === v}
              href={v ? "?paper=A5" : "?"}
              replace
              className={cn("flex h-10 items-center rounded-full px-4 text-sm font-medium", (sp.paper ?? "") === v ? "bg-surface shadow-card" : "text-muted")}
            >
              {label}
            </Link>
          ))}
        </div>
        <PrintButton />
      </div>
      <section className="card flex flex-wrap justify-center gap-6 bg-surface-2 print:block print:border-0 print:bg-white print:p-0 print:shadow-none" aria-label="Slip preview">
        <div className="rounded-xl shadow-card print:shadow-none">{copy(false)}</div>
        <div className="rounded-xl shadow-card print:shadow-none">{copy(true)}</div>
      </section>
    </div>
  );
}
