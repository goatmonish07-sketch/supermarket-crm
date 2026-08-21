"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Users, Pencil, Loader2, Star, Phone, ChevronRight } from "lucide-react";
import { formatINR, formatNumber } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";

type Customer = {
  id: string; name: string; phone: string; email: string | null; address: string | null;
  loyaltyPoints: number; dueBalance: number; invoiceCount: number;
};

export default function CustomersClient({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email?.toLowerCase().includes(q));
  }, [customers, query]);

  const totalDues = customers.reduce((s, c) => s + c.dueBalance, 0);
  const totalPoints = customers.reduce((s, c) => s + c.loyaltyPoints, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Customers" subtitle={`${customers.length} customers · ${formatINR(totalDues, { compact: true })} dues · ${formatNumber(totalPoints)} loyalty pts`}>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> Add Customer</button>
      </PageHeader>

      <div className="card card-pad">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-10" placeholder="Search by name, phone or email..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="No customers yet" description="Add your first customer to start tracking loyalty and dues." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="card card-pad transition-shadow hover:shadow-card-hover">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-sm font-bold text-white">
                    {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs text-ink-muted"><Phone className="h-3 w-3" />{c.phone}</p>
                  </div>
                </div>
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="btn-ghost btn-sm px-2"><Pencil className="h-4 w-4" /></button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-surface-sunken py-2">
                  <p className="text-[10px] font-semibold uppercase text-ink-muted">Bills</p>
                  <p className="text-sm font-bold text-ink tnum">{c.invoiceCount}</p>
                </div>
                <div className="rounded-lg bg-amber-50 py-2">
                  <p className="text-[10px] font-semibold uppercase text-amber-600">Points</p>
                  <p className="flex items-center justify-center gap-0.5 text-sm font-bold text-amber-600 tnum"><Star className="h-3 w-3 fill-amber-500 text-amber-500" />{c.loyaltyPoints}</p>
                </div>
                <div className={`rounded-lg py-2 ${c.dueBalance > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
                  <p className={`text-[10px] font-semibold uppercase ${c.dueBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>Dues</p>
                  <p className={`text-sm font-bold tnum ${c.dueBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatINR(c.dueBalance, { compact: true })}</p>
                </div>
              </div>

              <Link href={`/customers/${c.id}`} className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-violet-100 py-2 text-sm font-semibold text-violet-600 hover:bg-violet-50">
                View history <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {showForm && <CustomerForm customer={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />}
    </div>
  );
}

function CustomerForm({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "", address: customer?.address ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const url = customer ? `/api/customers/${customer.id}` : "/api/customers";
    const res = await fetch(url, { method: customer ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); setSaving(false); return; }
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={customer ? "Edit Customer" : "Add Customer"}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Full name</label><input required autoFocus className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label">Phone number</label><input required type="tel" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><label className="label">Email (optional)</label><input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label">Address (optional)</label><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{customer ? "Save" : "Add customer"}</button>
        </div>
      </form>
    </Modal>
  );
}
