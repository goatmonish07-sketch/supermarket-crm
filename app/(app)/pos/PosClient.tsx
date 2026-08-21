"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X, Loader2, CheckCircle2,
  Package, Percent, User, Printer,
} from "lucide-react";
import clsx from "clsx";
import { formatINR } from "@/lib/format";
import { computeTotals, loyaltyPointsFor, type CartLine } from "@/lib/billing";
import ProductThumb from "@/components/ui/ProductThumb";

type Product = {
  id: string; name: string; sku: string; sellPrice: number;
  taxRate: number; stock: number; unit: string; categoryId: string | null; image: string | null;
};
type Category = { id: string; name: string; color: string };
type Customer = { id: string; name: string; phone: string };

const PAYMENT_MODES = ["CASH", "UPI", "CARD", "CREDIT"] as const;
type Mode = (typeof PAYMENT_MODES)[number];

export default function PosClient({
  products, categories, customers, loyaltyRate,
}: {
  products: Product[]; categories: Category[]; customers: Customer[]; loyaltyRate: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [customerId, setCustomerId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("CASH");
  const [paidInput, setPaidInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<null | { invoiceNo: string; id: string; loyalty: number }>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat !== "all" && p.categoryId !== activeCat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, query, activeCat]);

  const totals = useMemo(() => computeTotals(cart, discount), [cart, discount]);
  const loyalty = loyaltyPointsFor(totals.grandTotal, loyaltyRate);

  function addToCart(p: Product) {
    setError("");
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        if (existing.qty + 1 > p.stock) return prev;
        return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      if (p.stock <= 0) return prev;
      return [...prev, { productId: p.id, name: p.name, qty: 1, unitPrice: p.sellPrice, taxRate: p.taxRate, stock: p.stock, unit: p.unit }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.productId !== id) return [l];
        const capped = Math.max(0, Math.min(qty, l.stock ?? qty));
        return capped <= 0 ? [] : [{ ...l, qty: capped }];
      }),
    );
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.productId !== id));
  }

  function resetSale() {
    setCart([]); setDiscount(0); setCustomerId(""); setMode("CASH"); setPaidInput(""); setError(""); setSuccess(null);
  }

  const paidAmount = mode === "CREDIT" ? (paidInput === "" ? 0 : Number(paidInput)) : totals.grandTotal;
  const dueAmount = Math.max(0, totals.grandTotal - paidAmount);

  async function checkout() {
    setError("");
    if (cart.length === 0) return;
    if (mode === "CREDIT" && !customerId) {
      setError("Select a customer for credit / khata sales.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({ productId: l.productId, qty: l.qty })),
          customerId: customerId || null,
          discount,
          paymentMode: mode,
          paidAmount: mode === "CREDIT" ? paidAmount : undefined,
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        setError(data.error || "Checkout failed.");
        setSubmitting(false);
        return;
      }
      setSuccess({ invoiceNo: data.invoiceNo, id: data.invoiceId, loyalty: data.loyaltyEarned });
      setSubmitting(false);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
      {/* Products */}
      <div className="space-y-4">
        <div className="card card-pad">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              autoFocus
              className="input pl-10"
              placeholder="Search by product name or SKU / barcode..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => setActiveCat("all")}
              className={clsx("btn-sm rounded-full px-4", activeCat === "all" ? "bg-brand-gradient text-white" : "bg-violet-50 text-ink-soft hover:bg-violet-100")}>
              All
            </button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)}
                className={clsx("btn-sm rounded-full px-4", activeCat === c.id ? "bg-brand-gradient text-white" : "bg-violet-50 text-ink-soft hover:bg-violet-100")}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const out = p.stock <= 0;
            return (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={out}
                className={clsx(
                  "card card-pad group relative text-left transition-all",
                  out ? "opacity-50" : "hover:-translate-y-0.5 hover:shadow-card-hover",
                )}
              >
                <ProductThumb src={p.image} name={p.name} className="h-24 w-full" iconClass="h-7 w-7" />
                <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-ink">{p.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-base font-extrabold text-violet-600 tnum">{formatINR(p.sellPrice)}</p>
                  <span className="text-[11px] text-ink-muted">{p.stock} {p.unit}</span>
                </div>
                {p.taxRate > 0 && <span className="absolute right-2 top-2 badge-muted">GST {p.taxRate}%</span>}
                {!out && (
                  <span className="absolute inset-x-3 bottom-3 hidden items-center justify-center gap-1 rounded-lg bg-brand-gradient py-1.5 text-xs font-semibold text-white group-hover:flex">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-ink-muted">No products match your search.</div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="lg:sticky lg:top-20 lg:h-fit">
        <div className="card flex max-h-[calc(100dvh-6rem)] flex-col">
          <div className="flex items-center justify-between border-b border-violet-100 px-5 py-4">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <ShoppingCart className="h-5 w-5 text-violet-500" /> Current Bill
            </h2>
            {cart.length > 0 && (
              <button onClick={resetSale} className="text-xs font-semibold text-danger hover:underline">Clear</button>
            )}
          </div>

          {/* Lines */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-400">
                  <ShoppingCart className="h-7 w-7" />
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">Cart is empty</p>
                <p className="text-xs text-ink-muted">Tap products to start billing.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((l) => (
                  <div key={l.productId} className="flex items-center gap-2 rounded-xl bg-surface-sunken p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{l.name}</p>
                      <p className="text-xs text-ink-muted tnum">{formatINR(l.unitPrice)} × {l.qty} = {formatINR(l.qty * l.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(l.productId, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-surface text-ink-soft hover:bg-violet-100" aria-label="Decrease">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-ink tnum">{l.qty}</span>
                      <button onClick={() => setQty(l.productId, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-surface text-ink-soft hover:bg-violet-100" aria-label="Increase">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button onClick={() => removeLine(l.productId)} className="grid h-7 w-7 place-items-center rounded-lg text-danger hover:bg-danger/10" aria-label="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary + checkout */}
          {cart.length > 0 && (
            <div className="space-y-3 border-t border-violet-100 p-4">
              {/* Customer */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-ink-muted" />
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                  className="input h-10 flex-1 text-sm">
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
                  ))}
                </select>
              </div>

              {/* Discount */}
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 shrink-0 text-ink-muted" />
                <input type="number" min={0} value={discount || ""} placeholder="Discount ₹"
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="input h-10 flex-1 text-sm tnum" />
              </div>

              {/* Payment modes */}
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_MODES.map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={clsx("rounded-lg py-2 text-xs font-semibold transition",
                      mode === m ? "bg-brand-gradient text-white" : "bg-violet-50 text-ink-soft hover:bg-violet-100")}>
                    {m === "CREDIT" ? "Khata" : m.charAt(0) + m.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {mode === "CREDIT" && (
                <input type="number" min={0} value={paidInput} placeholder="Amount paid now ₹ (rest = due)"
                  onChange={(e) => setPaidInput(e.target.value)}
                  className="input h-10 text-sm tnum" />
              )}

              {/* Totals */}
              <div className="space-y-1.5 rounded-xl bg-surface-sunken p-3 text-sm">
                <Row label="Subtotal" value={formatINR(totals.subtotal)} />
                {totals.discount > 0 && <Row label="Discount" value={`− ${formatINR(totals.discount)}`} tone="danger" />}
                <Row label={`GST (CGST ${formatINR(totals.cgst)} + SGST ${formatINR(totals.sgst)})`} value={formatINR(totals.taxTotal)} small />
                <div className="my-1 border-t border-violet-100" />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">Grand Total</span>
                  <span className="text-lg font-extrabold text-violet-600 tnum">{formatINR(totals.grandTotal)}</span>
                </div>
                {mode === "CREDIT" && dueAmount > 0 && (
                  <Row label="Due (khata)" value={formatINR(dueAmount)} tone="danger" />
                )}
                {loyalty > 0 && (
                  <p className="pt-1 text-[11px] font-medium text-emerald-600">+{loyalty} loyalty points will be earned</p>
                )}
              </div>

              {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>}

              <button onClick={checkout} disabled={submitting} className="btn-primary w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {submitting ? "Processing..." : `Complete Sale · ${formatINR(totals.grandTotal)}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success modal */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm animate-scale-in rounded-2xl bg-surface p-6 text-center shadow-pop">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-ink">Sale Completed!</h3>
            <p className="mt-1 text-sm text-ink-muted">Invoice <span className="font-semibold text-ink">{success.invoiceNo}</span> created.</p>
            {success.loyalty > 0 && <p className="mt-1 text-xs font-medium text-emerald-600">+{success.loyalty} loyalty points awarded</p>}
            <div className="mt-6 flex gap-2">
              <button onClick={resetSale} className="btn-outline flex-1">
                <X className="h-4 w-4" /> New Sale
              </button>
              <button onClick={() => router.push(`/invoices/${success.id}?print=1`)} className="btn-primary flex-1">
                <Printer className="h-4 w-4" /> Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, tone, small }: { label: string; value: string; tone?: "danger"; small?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={clsx(small ? "text-[11px]" : "", "text-ink-muted")}>{label}</span>
      <span className={clsx("font-medium tnum", tone === "danger" ? "text-danger" : "text-ink-soft")}>{value}</span>
    </div>
  );
}
