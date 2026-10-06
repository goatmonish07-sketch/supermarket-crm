import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SaleStatusPill } from "@/app/(app)/billing/bills/status";
import { CustomerForm } from "../customer-form";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("customers.manage");
  const customer = await db.customer.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { sales: { orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { items: true } } } } },
  });
  if (!customer) notFound();
  const tz = user.store?.timezone ?? "Asia/Kolkata";
  const live = customer.sales.filter((s) => s.status !== "CANCELLED");
  const spend = live.reduce((t, s) => t + s.total - s.refundedTotal, 0);
  const due = live.reduce((t, s) => t + Math.max(0, s.total - s.paidTotal), 0);

  return (
    <div className="space-y-4">
      <PageHeader title={customer.name} subtitle={<span className="tabular">{customer.phone}</span>} back={{ href: "/customers", label: "Customers" }} />
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Visits", String(live.length)],
          ["Total spent", formatMoney(spend)],
          ["Balance due", formatMoney(due)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4 sm:p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="tabular mt-1 text-xl font-bold sm:text-2xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="card">
          <h2 className="text-xl font-semibold">Purchases</h2>
          {customer.sales.length === 0 ? (
            <p className="mt-4 text-muted">No bills yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {customer.sales.map((s) => (
                <li key={s.id}>
                  <Link href={`/billing/bills/${s.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl px-2 py-3 hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold">{s.number}</p>
                      <p className="text-sm text-muted">
                        {formatDateTime(s.createdAt, tz)} · {s._count.items} line{s._count.items === 1 ? "" : "s"}
                      </p>
                    </div>
                    <SaleStatusPill status={s.status} returnState={s.returnState} />
                    <span className="tabular w-24 text-right font-semibold">{formatMoney(s.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card h-fit">
          <h2 className="mb-4 text-xl font-semibold">Details</h2>
          <CustomerForm
            initial={{
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email ?? "",
              birthday: customer.birthday ? customer.birthday.toISOString().slice(0, 10) : "",
              notes: customer.notes ?? "",
            }}
          />
        </section>
      </div>
    </div>
  );
}
