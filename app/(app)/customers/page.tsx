import Link from "next/link";
import { ChevronRight, UserPlus, UsersRound } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await requirePermission("customers.manage");
  const digits = q?.replace(/\D/g, "") ?? "";
  const customers = await db.customer.findMany({
    where: {
      tenantId: user.tenantId,
      OR: q ? [{ name: { contains: q, mode: "insensitive" } }, ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])] : undefined,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  const stats = customers.length
    ? await db.sale.groupBy({
        by: ["customerId"],
        where: { tenantId: user.tenantId, customerId: { in: customers.map((c) => c.id) }, status: { not: "CANCELLED" } },
        _sum: { total: true, paidTotal: true, refundedTotal: true },
        _count: true,
        _max: { createdAt: true },
      })
    : [];
  const byCustomer = new Map(stats.map((s) => [s.customerId, s]));
  const total = await db.customer.count({ where: { tenantId: user.tenantId } });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        subtitle={`${total} customer${total === 1 ? "" : "s"}`}
        actions={
          <Link href="/customers/new" className="btn-primary h-12">
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Add customer
          </Link>
        }
      />
      <section className="card">
        <form action="/customers" className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only">Search customers</span>
            <input name="q" type="search" defaultValue={q} className="input" placeholder="Name or mobile number" />
          </label>
          <button className="btn-outline h-12">Search</button>
        </form>
        {customers.length === 0 ? (
          <EmptyState icon={UsersRound} title={q ? "No match" : "No customers yet"} text={q ? "Try another name or number." : "Customers are added when you attach them to a bill, or add them here."}>
            <Link href="/customers/new" className="btn-primary h-12">
              Add customer
            </Link>
          </EmptyState>
        ) : (
          <ul className="mt-5 divide-y divide-border/60">
            {customers.map((c) => {
              const s = byCustomer.get(c.id);
              const spend = (s?._sum.total ?? 0) - (s?._sum.refundedTotal ?? 0);
              const due = (s?._sum.total ?? 0) - (s?._sum.paidTotal ?? 0);
              return (
                <li key={c.id}>
                  <Link href={`/customers/${c.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-surface-2">
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="tabular truncate text-sm text-muted">
                        {c.phone} · {s?._count ?? 0} visit{s?._count === 1 ? "" : "s"}
                        {s?._max.createdAt && ` · last ${s._max.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                      </p>
                    </div>
                    {due > 0 && <StatusPill tone="warning">Due {formatMoney(due)}</StatusPill>}
                    <span className="tabular hidden w-28 text-right font-semibold sm:block">{formatMoney(spend)}</span>
                    <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
