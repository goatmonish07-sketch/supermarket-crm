"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Truck, Pencil, Trash2, Loader2, Phone, Mail, MapPin } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";

type Supplier = { id: string; name: string; phone: string | null; email: string | null; address: string | null };

export default function SuppliersClient({ suppliers, isAdmin }: { suppliers: Supplier[]; isAdmin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function remove(s: Supplier) {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    await fetch(`/api/suppliers/${s.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Suppliers" subtitle={`${suppliers.length} suppliers`}>
        {isAdmin && <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> Add Supplier</button>}
      </PageHeader>

      {suppliers.length === 0 ? (
        <div className="card"><EmptyState icon={Truck} title="No suppliers yet" description="Add suppliers to keep purchase contacts handy." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => (
            <div key={s.id} className="card card-pad">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-500"><Truck className="h-5 w-5" /></div>
                  <p className="font-semibold text-ink">{s.name}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(s); setShowForm(true); }} className="btn-ghost btn-sm px-2"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(s)} className="btn-ghost btn-sm px-2 text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {s.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-ink-muted" />{s.phone}</p>}
                {s.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-ink-muted" />{s.email}</p>}
                {s.address && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-ink-muted" />{s.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <SupplierForm supplier={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />}
    </div>
  );
}

function SupplierForm({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: supplier?.name ?? "", phone: supplier?.phone ?? "", email: supplier?.email ?? "", address: supplier?.address ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const url = supplier ? `/api/suppliers/${supplier.id}` : "/api/suppliers";
    const res = await fetch(url, { method: supplier ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); setSaving(false); return; }
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={supplier ? "Edit Supplier" : "Add Supplier"}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Supplier name</label><input required autoFocus className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label">Phone</label><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><label className="label">Email</label><input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label">Address</label><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{supplier ? "Save" : "Add"}</button>
        </div>
      </form>
    </Modal>
  );
}
