"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2, CheckCircle2, Building2, Star } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import type { AppSettings } from "@/lib/settings";

export default function SettingsClient({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [f, setF] = useState({
    shopName: settings.shopName, tagline: settings.tagline, address: settings.address,
    phone: settings.phone, gstin: settings.gstin, loyaltyRate: settings.loyaltyRate,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaved(false); setSaving(true);
    const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); setSaving(false); return; }
    setSaving(false); setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" subtitle="Store profile, tax and loyalty configuration" />

      <form onSubmit={submit} className="space-y-5">
        {/* Store profile */}
        <div className="card card-pad space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink"><Store className="h-4 w-4 text-violet-500" /> Store Profile</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="label">Shop name</label><input required className="input" value={f.shopName} onChange={(e) => setF({ ...f, shopName: e.target.value })} /></div>
            <div><label className="label">Tagline</label><input className="input" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          </div>
        </div>

        {/* Tax */}
        <div className="card card-pad space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink"><Building2 className="h-4 w-4 text-violet-500" /> Tax & Invoicing</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="label">GSTIN</label><input className="input" value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value })} placeholder="33ABCDE1234F1Z5" /></div>
            <div><label className="label">Currency</label><input className="input bg-surface-sunken" value="₹ INR (India)" disabled /></div>
          </div>
          <p className="text-xs text-ink-muted">GST is charged per-product using the slab set on each item (0/5/12/18/28%), split into CGST + SGST on invoices.</p>
        </div>

        {/* Loyalty */}
        <div className="card card-pad space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink"><Star className="h-4 w-4 text-violet-500" /> Loyalty Program</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-soft">Earn 1 point for every ₹</span>
            <input type="number" min={1} className="input w-28 tnum" value={f.loyaltyRate} onChange={(e) => setF({ ...f, loyaltyRate: Number(e.target.value) })} />
            <span className="text-sm text-ink-soft">spent</span>
          </div>
        </div>

        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="flex items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
          <button type="submit" disabled={saving} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save changes</button>
        </div>
      </form>
    </div>
  );
}
