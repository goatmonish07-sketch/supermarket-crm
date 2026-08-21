"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { formatINR } from "@/lib/format";

export default function CollectDue({ customerId, dueBalance }: { customerId: string; dueBalance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(dueBalance);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch(`/api/customers/${customerId}/collect`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); setSaving(false); return; }
    setOpen(false); setSaving(false); router.refresh();
  }

  if (dueBalance <= 0) return null;

  return (
    <>
      <button onClick={() => { setAmount(dueBalance); setOpen(true); }} className="btn-primary btn-sm">
        <HandCoins className="h-4 w-4" /> Collect Dues
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Collect Dues" size="sm">
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl bg-rose-50 p-3 text-sm">
            <span className="text-rose-600">Outstanding balance: </span>
            <span className="font-bold text-rose-700 tnum">{formatINR(dueBalance)}</span>
          </div>
          <div>
            <label className="label">Amount received (₹)</label>
            <input type="number" autoFocus min={0} max={dueBalance} step="0.01" className="input tnum" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving || amount <= 0} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Record payment</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
