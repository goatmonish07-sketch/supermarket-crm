import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, MapPin, Phone, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PAYMENT_LABEL } from "@/lib/billing";
import { formatDateTime, localDate } from "@/lib/dates";
import { KIND_LABEL, STATUS_LABEL, STATUS_TONE, isOpen, statusMessage } from "@/lib/orders";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { OrderActions } from "./order-actions";

export const metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const manage = can(user.role, "orders.manage");
  if (!manage && !can(user.role, "jobs.update")) redirect("/dashboard?denied=1");

  const order = await db.order.findFirst({
    where: { id, tenantId: user.tenantId, ...(manage ? {} : { assigneeId: user.id }) },
    include: {
      customer: true,
      assignee: { select: { name: true } },
      items: { include: { variant: { include: { item: { select: { type: true } } } } } },
      payments: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      sale: { select: { id: true, number: true } },
      store: { select: { name: true, timezone: true } },
    },
  });
  if (!order) notFound();
  const staff = manage ? await db.user.findMany({ where: { tenantId: user.tenantId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];

  const tz = order.store.timezone;
  const open = isOpen(order.status);
  const balance = Math.max(0, order.estimate - order.advancePaid);
  const overdue = open && order.dueDate && localDate(order.dueDate, tz) < localDate(new Date(), tz);
  const shortStock = order.kind === "ORDER" && order.items.some((i) => (i.variant.item.type === "GOODS" || i.variant.item.type === "RENTAL") && i.reservedQty < i.qty);
  const snapshot = order.measurementSnapshot as { label: string; values: Record<string, number>; notes?: string | null } | null;
  const text = statusMessage({ number: order.number, kind: order.kind, status: order.status, customerName: order.customer.name, dueDate: order.dueDate, balance }, order.store.name, formatMoney);
  const whatsappHref = `https://wa.me/91${order.customer.phone}?text=${encodeURIComponent(text)}`;
  const day = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }) : "—");
  const iso = (d: Date | null) => (d ? localDate(d, tz) : "");

  return (
    <div className="space-y-4">
      <PageHeader
        title={order.number}
        back={{ href: `/orders?kind=${order.kind}`, label: "Orders & Jobs" }}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {KIND_LABEL[order.kind]}
            <StatusPill tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</StatusPill>
            {order.onHold && <StatusPill tone="warning">On hold</StatusPill>}
            {overdue && <StatusPill tone="danger">Overdue</StatusPill>}
            {order.sale && (
              <Link href={`/billing/bills/${order.sale.id}`} className="font-mono text-sm text-primary underline-offset-2 hover:underline">
                Bill {order.sale.number}
              </Link>
            )}
          </span>
        }
      />
      {sp.created && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" /> {order.number} created. Print the slip for the customer and workshop.
        </p>
      )}

      <section className="card">
        <OrderActions
          id={order.id}
          number={order.number}
          kind={order.kind}
          status={order.status}
          onHold={order.onHold}
          open={open}
          balance={balance}
          advance={order.advancePaid}
          canManage={manage}
          canWork={manage || (order.kind === "JOB" && order.assigneeId === user.id)}
          canBill={can(user.role, "billing.use")}
          canCancel={can(user.role, "billing.refund")}
          shortStock={shortStock}
          whatsappHref={whatsappHref}
          staff={staff}
          details={{ dueDate: iso(order.dueDate), trialDate: iso(order.trialDate), assigneeId: order.assigneeId ?? "", notes: order.notes ?? "" }}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Customer</h2>
          <p className="flex items-center gap-2 font-semibold">
            <UserRound className="h-4 w-4 text-muted" aria-hidden="true" />
            {manage ? <Link href={`/customers/${order.customer.id}`} className="hover:underline">{order.customer.name}</Link> : order.customer.name}
          </p>
          <a href={`tel:${order.customer.phone}`} className="tabular flex min-h-11 items-center gap-2 text-sm text-primary">
            <Phone className="h-4 w-4" aria-hidden="true" /> {order.customer.phone}
          </a>
          {order.deliveryMode === "DELIVERY" && (
            <p className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-muted" aria-hidden="true" /> {order.deliveryAddress ?? "Delivery address not set"}
            </p>
          )}
          <dl className="space-y-1.5 border-t border-border/70 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="flex items-center gap-1.5 text-muted">
                <CalendarClock className="h-4 w-4" aria-hidden="true" /> Due
              </dt>
              <dd className={overdue ? "font-semibold text-danger" : ""}>{day(order.dueDate)}</dd>
            </div>
            {order.kind === "JOB" && (
              <div className="flex justify-between">
                <dt className="text-muted">Trial</dt>
                <dd>{day(order.trialDate)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Assigned</dt>
              <dd>{order.assignee?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Created</dt>
              <dd>{formatDateTime(order.createdAt, tz)}</dd>
            </div>
          </dl>
          {order.notes && <p className="rounded-2xl bg-surface-2 p-3 text-sm">{order.notes}</p>}
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">{order.kind === "JOB" ? "Work" : "Items"}</h2>
          <ul className="divide-y divide-border/60">
            {order.items.map((i) => {
              const tracked = i.variant.item.type === "GOODS" || i.variant.item.type === "RENTAL";
              return (
                <li key={i.id} className="py-2.5">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">
                      {i.qty > 1 && <span className="tabular">{i.qty} × </span>}
                      {i.description}
                    </span>
                    <span className="tabular">{formatMoney(i.price * i.qty)}</span>
                  </div>
                  {i.note && <p className="text-sm italic text-muted">{i.note}</p>}
                  {order.kind === "ORDER" && tracked && open && (
                    <p className={i.reservedQty < i.qty ? "text-xs font-medium text-warning" : "text-xs text-success"}>
                      {i.reservedQty < i.qty ? `${i.qty - i.reservedQty} still to arrive` : "Held for customer"}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <dl className="space-y-1 border-t border-border/70 pt-3 text-sm">
            <div className="flex justify-between">
              <dt>Estimate</dt>
              <dd className="tabular">{formatMoney(order.estimate)}</dd>
            </div>
            {order.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-muted">
                <dt>
                  {p.amount < 0 ? "Refund" : "Advance"} · {PAYMENT_LABEL[p.method]}
                </dt>
                <dd className="tabular">{formatMoney(p.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold">
              <dt>{order.sale ? "Settled on bill" : "Balance"}</dt>
              <dd className="tabular">{formatMoney(order.sale ? 0 : balance)}</dd>
            </div>
          </dl>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-semibold">Measurements</h2>
          {snapshot ? (
            <>
              <p className="text-sm font-medium">{snapshot.label}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {Object.entries(snapshot.values).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-dashed border-border/70 pb-1">
                    <dt className="text-muted">{k}</dt>
                    <dd className="tabular font-semibold">{v}&quot;</dd>
                  </div>
                ))}
              </dl>
              {snapshot.notes && <p className="text-sm italic text-muted">{snapshot.notes}</p>}
            </>
          ) : (
            <p className="text-sm text-muted">No measurements attached.</p>
          )}
          {order.designNotes && (
            <div className="rounded-2xl bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Design notes</p>
              <p className="mt-1 whitespace-pre-line text-sm">{order.designNotes}</p>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="text-xl font-semibold">History</h2>
        <ol className="mt-4 space-y-3 border-l-2 border-border pl-5">
          {order.events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-primary" aria-hidden="true" />
              <p className="font-medium">
                {e.status ? STATUS_LABEL[e.status] : e.message}
                {e.status && e.message && !e.message.startsWith("Moved to") && <span className="font-normal text-muted"> · {e.message}</span>}
              </p>
              <p className="text-sm text-muted">
                {formatDateTime(e.createdAt, tz)}
                {e.user && ` · ${e.user.name}`}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
