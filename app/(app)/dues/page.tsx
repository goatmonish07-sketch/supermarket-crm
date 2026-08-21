import Link from "next/link";
import { NotebookPen, Phone } from "lucide-react";
import { query } from "@/lib/d1";
import { formatINR } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import CollectDue from "@/components/customer/CollectDue";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function DuesPage() {
  const customers = await query<{ id: string; name: string; phone: string; dueBalance: number }>(
    `SELECT id, name, phone, dueBalance FROM Customer WHERE dueBalance > 0 ORDER BY dueBalance DESC`,
  );
  const totalDues = customers.reduce((s, c) => s + c.dueBalance, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Khata / Dues" subtitle={`${customers.length} customers owe ${formatINR(totalDues)} in total`} />

      {customers.length === 0 ? (
        <div className="card"><EmptyState icon={NotebookPen} title="No pending dues 🎉" description="All customer khata accounts are settled." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-surface-sunken">
                  <th className="th">Customer</th><th className="th">Phone</th>
                  <th className="th text-right">Outstanding</th><th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-violet-50/40">
                    <td className="td">
                      <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient text-xs font-bold text-white">
                          {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <span className="font-semibold text-ink hover:underline">{c.name}</span>
                      </Link>
                    </td>
                    <td className="td"><span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-ink-muted" />{c.phone}</span></td>
                    <td className="td text-right"><span className="font-bold text-rose-600 tnum">{formatINR(c.dueBalance)}</span></td>
                    <td className="td text-right"><div className="flex justify-end"><CollectDue customerId={c.id} dueBalance={c.dueBalance} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
