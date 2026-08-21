"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Package, Pencil, PackagePlus, Loader2, Boxes, Tag,
} from "lucide-react";
import clsx from "clsx";
import { formatINR, formatNumber, GST_SLABS } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { StockBadge } from "@/components/ui/Badges";

type Product = {
  id: string; name: string; sku: string; categoryId: string | null;
  categoryName: string | null; categoryColor: string;
  costPrice: number; sellPrice: number; taxRate: number;
  stock: number; unit: string; lowStockThreshold: number;
};
type Category = { id: string; name: string; color: string };

const UNITS = ["pcs", "kg", "g", "L", "ml", "pack", "bag", "bottle", "dozen"];

export default function ProductsClient({
  products, categories, isAdmin, initialFilter,
}: {
  products: Product[]; categories: Category[]; isAdmin: boolean; initialFilter: "all" | "low";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low">(initialFilter);

  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.categoryId !== cat) return false;
      if (stockFilter === "low" && p.stock > p.lowStockThreshold) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, query, cat, stockFilter]);

  const lowCount = products.filter((p) => p.stock <= p.lowStockThreshold).length;
  const stockValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Inventory" subtitle={`${products.length} products · ${formatINR(stockValue, { compact: true })} stock value`}>
        {isAdmin && (
          <>
            <button onClick={() => setShowCatModal(true)} className="btn-outline btn-sm"><Tag className="h-4 w-4" /> Category</button>
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> Add Product</button>
          </>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="card card-pad space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-10" placeholder="Search products or SKU..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setStockFilter(stockFilter === "low" ? "all" : "low")}
            className={clsx("btn-sm rounded-full px-4", stockFilter === "low" ? "bg-danger text-white" : "bg-rose-50 text-rose-600 hover:bg-rose-100")}>
            Low stock ({lowCount})
          </button>
          <span className="mx-1 h-5 w-px bg-violet-100" />
          <button onClick={() => setCat("all")} className={clsx("btn-sm rounded-full px-4", cat === "all" ? "bg-brand-gradient text-white" : "bg-violet-50 text-ink-soft hover:bg-violet-100")}>All</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={clsx("btn-sm rounded-full px-4", cat === c.id ? "bg-brand-gradient text-white" : "bg-violet-50 text-ink-soft hover:bg-violet-100")}>{c.name}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Boxes} title="No products found" description="Adjust filters or add a new product." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="bg-surface-sunken">
                  <th className="th">Product</th>
                  <th className="th">Category</th>
                  <th className="th text-right">Cost</th>
                  <th className="th text-right">Price</th>
                  <th className="th text-center">GST</th>
                  <th className="th text-right">Stock</th>
                  <th className="th">Status</th>
                  {isAdmin && <th className="th text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-violet-50/40">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: p.categoryColor + "22", color: p.categoryColor }}>
                          <Package className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-ink">{p.name}</p>
                          <p className="text-xs text-ink-muted">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td">{p.categoryName ?? "—"}</td>
                    <td className="td text-right tnum">{formatINR(p.costPrice)}</td>
                    <td className="td text-right font-semibold text-ink tnum">{formatINR(p.sellPrice)}</td>
                    <td className="td text-center">{p.taxRate}%</td>
                    <td className="td text-right font-semibold tnum">{formatNumber(p.stock)} <span className="text-xs font-normal text-ink-muted">{p.unit}</span></td>
                    <td className="td"><StockBadge stock={p.stock} threshold={p.lowStockThreshold} /></td>
                    {isAdmin && (
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setRestocking(p)} className="btn-ghost btn-sm px-2" title="Restock"><PackagePlus className="h-4 w-4" /></button>
                          <button onClick={() => { setEditing(p); setShowForm(true); }} className="btn-ghost btn-sm px-2" title="Edit"><Pencil className="h-4 w-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <ProductForm product={editing} categories={categories} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />}
      {restocking && <RestockModal product={restocking} onClose={() => setRestocking(null)} onSaved={() => { setRestocking(null); router.refresh(); }} />}
      {showCatModal && <CategoryModal onClose={() => setShowCatModal(false)} onSaved={() => { setShowCatModal(false); router.refresh(); }} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

function ProductForm({ product, categories, onClose, onSaved }: { product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: product?.name ?? "", sku: product?.sku ?? "",
    categoryId: product?.categoryId ?? "", costPrice: product?.costPrice ?? 0,
    sellPrice: product?.sellPrice ?? 0, taxRate: product?.taxRate ?? 0,
    stock: product?.stock ?? 0, unit: product?.unit ?? "pcs", lowStockThreshold: product?.lowStockThreshold ?? 10,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const url = product ? `/api/products/${product.id}` : "/api/products";
    const res = await fetch(url, { method: product ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save."); setSaving(false); return; }
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={product ? "Edit Product" : "Add Product"} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Product name"><input required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="SKU / Barcode"><input required className="input" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></Field>
          <Field label="Category">
            <select className="input" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
              <option value="">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Unit">
            <select className="input" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Cost price (₹)"><input type="number" min={0} step="0.01" className="input tnum" value={f.costPrice} onChange={(e) => setF({ ...f, costPrice: Number(e.target.value) })} /></Field>
          <Field label="Selling price (₹)"><input type="number" min={0} step="0.01" className="input tnum" value={f.sellPrice} onChange={(e) => setF({ ...f, sellPrice: Number(e.target.value) })} /></Field>
          <Field label="GST slab">
            <select className="input" value={f.taxRate} onChange={(e) => setF({ ...f, taxRate: Number(e.target.value) })}>
              {GST_SLABS.map((g) => <option key={g} value={g}>{g}%</option>)}
            </select>
          </Field>
          <Field label="Low-stock alert at"><input type="number" min={0} className="input tnum" value={f.lowStockThreshold} onChange={(e) => setF({ ...f, lowStockThreshold: Number(e.target.value) })} /></Field>
          {!product && (
            <Field label="Opening stock"><input type="number" min={0} className="input tnum" value={f.stock} onChange={(e) => setF({ ...f, stock: Number(e.target.value) })} /></Field>
          )}
        </div>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{product ? "Save changes" : "Add product"}</button>
        </div>
      </form>
    </Modal>
  );
}

function RestockModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState<number>(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch(`/api/products/${product.id}/restock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qty, note }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); setSaving(false); return; }
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={`Restock — ${product.name}`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-surface-sunken p-3 text-sm">
          <span className="text-ink-muted">Current stock: </span>
          <span className="font-bold text-ink tnum">{formatNumber(product.stock)} {product.unit}</span>
        </div>
        <Field label="Quantity to add (use negative to reduce)">
          <input type="number" autoFocus className="input tnum" value={qty || ""} onChange={(e) => setQty(Number(e.target.value))} />
        </Field>
        <Field label="Note (optional)"><input className="input" placeholder="e.g. Supplier delivery" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving || !qty} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Update stock</button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7c5cfc");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); setSaving(false); return; }
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="New Category" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Category name"><input autoFocus required className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Color"><input type="color" className="h-11 w-full rounded-xl border border-violet-200" value={color} onChange={(e) => setColor(e.target.value)} /></Field>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving || !name} className="btn-primary">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Create</button>
        </div>
      </form>
    </Modal>
  );
}
