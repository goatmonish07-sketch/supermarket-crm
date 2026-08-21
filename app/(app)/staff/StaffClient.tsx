"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserCog, Loader2, KeyRound, Power } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import { RoleBadge } from "@/components/ui/Badges";
import { formatDate } from "@/lib/format";

type Staff = { id: string; name: string; email: string; role: string; active: boolean; createdAt: string; invoiceCount: number };

export default function StaffClient({ users, currentUserId }: { users: Staff[]; currentUserId: string }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [resetting, setResetting] = useState<Staff | null>(null);

  async function patch(id: string, body: any) {
    const res = await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "Failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Staff Management" subtitle={`${users.length} staff accounts`}>
        <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> Add Staff</button>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-surface-sunken">
                <th className="th">Name</th>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th text-center">Bills</th>
                <th className="th">Joined</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "hover:bg-violet-50/40" : "bg-surface-sunken/60 opacity-60 hover:bg-violet-50/40"}>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient text-xs font-bold text-white">
                        {u.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                      <span className="font-semibold text-ink">{u.name}{u.id === currentUserId && <span className="ml-2 badge-violet">You</span>}</span>
                    </div>
                  </td>
                  <td className="td">{u.email}</td>
                  <td className="td"><RoleBadge role={u.role} /></td>
                  <td className="td text-center tnum">{u.invoiceCount}</td>
                  <td className="td whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setResetting(u)} className="btn-ghost btn-sm px-2" title="Reset password"><KeyRound className="h-4 w-4" /></button>
                      {u.id !== currentUserId && (
                        <>
                          <button onClick={() => patch(u.id, { role: u.role === "ADMIN" ? "CASHIER" : "ADMIN" })} className="btn-ghost btn-sm px-2" title="Toggle role"><UserCog className="h-4 w-4" /></button>
                          <button onClick={() => patch(u.id, { active: !u.active })} className={`btn-ghost btn-sm px-2 ${u.active ? "text-danger hover:bg-danger/10" : "text-success hover:bg-success/10"}`} title={u.active ? "Deactivate" : "Activate"}><Power className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddStaff onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); router.refresh(); }} />}
      {resetting && <ResetPassword staff={resetting} onClose={() => setResetting(null)} onSaved={() => { setResetting(null); router.refresh(); }} />}
    </div>
  );
}

function AddStaff({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", email: "", password: "", role: "CASHIER" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); setSaving(false); return; }
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="Add Staff Member">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Full name</label><input required autoFocus className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label">Email</label><input required type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label">Temporary password</label><input required type="text" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="min. 6 characters" /></div>
        <div><label className="label">Role</label>
          <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="CASHIER">Cashier</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Create staff</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPassword({ staff, onClose, onSaved }: { staff: Staff; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch(`/api/users/${staff.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); setSaving(false); return; }
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={`Reset password — ${staff.name}`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">New password</label><input required autoFocus type="text" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 6 characters" /></div>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving || password.length < 6} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Update</button>
        </div>
      </form>
    </Modal>
  );
}
