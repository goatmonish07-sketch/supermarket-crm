"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ClipboardList, Loader2, Minus, PauseCircle, Plus, ReceiptText, ScanLine, Search, ShoppingBag, Trash2, UserRound, X } from "lucide-react";
import { calculateBill, resolveDiscount, type CalcLineInput } from "@/lib/billing";
import { colourSwatch, stockStatus } from "@/lib/catalogue";
import { cn, formatMoney } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { StockPill } from "@/components/ui/stock-pill";
import { checkoutAction, discardHeldAction, holdBillAction } from "./actions";
import { ApprovalDialog, CustomerPicker, LineEditor, PayDialog, VariantPicker, type PaymentEntry } from "./dialogs";
import { lineLabel, type CartLine, type CartState, type PosSettings, type PosVariant, type StaffOption } from "./types";

type Held = { id: string; label: string; createdAt: string; by: string | null; payload: CartState };

const EMPTY: CartState = { lines: [], billDiscount: "", customer: null, salespersonId: null };
const money = (p: number) => formatMoney(p);
let keySeq = 0;
const newKey = () => `l${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export function Counter({
  catalogue,
  held,
  staff,
  approvers,
  settings,
  fromOrder = null,
}: {
  catalogue: PosVariant[];
  held: Held[];
  staff: StaffOption[];
  approvers: StaffOption[];
  settings: PosSettings;
  /** When billing an order/job: its lines, customer and advance. */
  fromOrder?: { id: string; number: string; advance: number; cart: CartState } | null;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [orderMode, setOrderMode] = useState(fromOrder);
  const [cart, setCart] = useState<CartState>(fromOrder?.cart ?? EMPTY);
  const [query, setQuery] = useState("");
  const [picker, setPicker] = useState<PosVariant[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false); // mobile
  const [approval, setApproval] = useState<{ reason: string; payments: PaymentEntry[] } | null>(null);
  const [toast, setToast] = useState("");
  const [payError, setPayError] = useState("");
  const [busy, startBusy] = useTransition();

  const byId = useMemo(() => new Map(catalogue.map((v) => [v.id, v])), [catalogue]);
  const byCode = useMemo(() => {
    const m = new Map<string, PosVariant>();
    for (const v of catalogue) {
      m.set(v.barcode.toLowerCase(), v);
      m.set(v.sku.toLowerCase(), v);
    }
    return m;
  }, [catalogue]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? "" : t)), 2500);
  };
  const focusSearch = () => window.setTimeout(() => searchRef.current?.focus(), 0);

  // ── Cart operations ──
  const add = useCallback((v: PosVariant, qty = 1) => {
    const askPrice = v.priceAtCounter && v.price === 0;
    const key = newKey();
    setCart((c) => {
      const existing = c.lines.find((l) => l.variantId === v.id && l.priceOverride === null && !l.discount && !l.note);
      if (existing && !v.priceAtCounter) {
        return { ...c, lines: c.lines.map((l) => (l === existing ? { ...l, qty: Math.min(999, l.qty + qty) } : l)) };
      }
      return { ...c, lines: [...c.lines, { key, variantId: v.id, qty, priceOverride: null, discount: "", note: "" }] };
    });
    flash(`Added ${v.name}${lineLabel(v) ? ` · ${lineLabel(v)}` : ""}`);
    // Services priced at the counter open the price editor straight away.
    if (askPrice) setEditing(key);
    else focusSearch();
  }, []);

  const updateLine = (key: string, patch: Partial<CartLine>) => setCart((c) => ({ ...c, lines: c.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
  const removeLine = (key: string) => setCart((c) => ({ ...c, lines: c.lines.filter((l) => l.key !== key) }));
  const clear = () => {
    if (orderMode) {
      setOrderMode(null);
      router.replace("/billing");
    }
    setCart(EMPTY);
    setPayError("");
    focusSearch();
  };

  // ── Search ──
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? catalogue.filter((v) => `${v.name} ${v.category ?? ""} ${v.size ?? ""} ${v.colour ?? ""} ${v.sku} ${v.barcode}`.toLowerCase().includes(q))
      : catalogue;
    const groups = new Map<string, PosVariant[]>();
    for (const v of pool) groups.set(v.itemId, [...(groups.get(v.itemId) ?? []), v]);
    return [...groups.values()].slice(0, 48);
  }, [catalogue, query]);

  const pickGroup = (group: PosVariant[]) => {
    const all = catalogue.filter((v) => v.itemId === group[0].itemId);
    if (all.length === 1) {
      const v = all[0];
      if (!canSell(v)) return flash(`${v.name} is out of stock`);
      add(v);
    } else setPicker(all);
  };

  const canSell = (v: PosVariant) => settings.allowNegativeStock || v.type === "SERVICE" || v.type === "NON_INVENTORY" || v.available - qtyInCart(v.id) > 0;
  const qtyInCart = (variantId: string) => cart.lines.filter((l) => l.variantId === variantId).reduce((s, l) => s + l.qty, 0);

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exact = byCode.get(q);
    if (exact) {
      if (!canSell(exact)) flash(`${exact.name} ${lineLabel(exact)} is out of stock`);
      else add(exact);
      setQuery("");
      return;
    }
    if (results.length === 1) pickGroup(results[0]);
  };

  // ── Totals ──
  const bill = useMemo(() => {
    const inputs: CalcLineInput[] = cart.lines.flatMap((l) => {
      const v = byId.get(l.variantId);
      if (!v) return [];
      const unitPrice = l.priceOverride ?? v.price;
      return [
        {
          key: l.key,
          unitPrice,
          qty: l.qty,
          lineDiscount: resolveDiscount(l.discount, unitPrice * l.qty),
          taxInclusive: v.taxInclusive,
          gstRateBp: v.gstRateBp,
          gstSlabAbove: v.gstSlabAbove,
          gstHighRateBp: v.gstHighRateBp,
          mrp: v.mrp,
        },
      ];
    });
    const net = inputs.reduce((s, l) => s + Math.max(0, l.unitPrice * l.qty - l.lineDiscount), 0);
    return calculateBill(inputs, resolveDiscount(cart.billDiscount, net), settings.roundOff);
  }, [cart, byId, settings.roundOff]);

  const advance = orderMode?.advance ?? 0;
  const toPay = Math.max(0, bill.payable - advance);

  const missingPrice = cart.lines.some((l) => {
    const v = byId.get(l.variantId);
    return v?.priceAtCounter && (l.priceOverride ?? v.price) <= 0;
  });

  // ── Checkout ──
  const submit = (payments: PaymentEntry[], approvalPin?: { userId: string; pin: string }) =>
    startBusy(async () => {
      setPayError("");
      const res = await checkoutAction({
        lines: cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty, priceOverride: l.priceOverride, discount: l.discount, note: l.note || undefined })),
        billDiscount: cart.billDiscount,
        customerId: cart.customer?.id ?? null,
        salespersonId: cart.salespersonId,
        payments,
        heldBillId: cart.heldBillId,
        orderId: orderMode?.id,
        approval: approvalPin,
      });
      if (res.ok) {
        setPayOpen(false);
        setApproval(null);
        setCart(EMPTY);
        router.push(`/billing/bills/${res.saleId}?print=1`);
      } else if (res.needsApproval) {
        setApproval({ reason: res.error, payments });
      } else {
        setApproval(null);
        setPayError(res.error);
      }
    });

  const hold = () =>
    startBusy(async () => {
      if (!cart.lines.length || orderMode) return;
      const label = cart.customer?.name ?? `Bill ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
      const r = await holdBillAction({ label, payload: cart });
      if (r.ok) {
        setCart(EMPTY);
        flash(`Held: ${label}`);
        router.refresh();
      } else flash(r.error);
    });

  const resume = (h: Held) => {
    if (cart.lines.length) return flash("Hold or clear the current bill first");
    const lines = h.payload.lines.filter((l) => byId.has(l.variantId));
    setCart({ ...h.payload, lines, heldBillId: h.id });
    setHeldOpen(false);
    if (lines.length < h.payload.lines.length) flash("Some items are no longer sold and were left out");
    focusSearch();
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        hold();
      } else if (e.key === "F8") {
        e.preventDefault();
        if (cart.lines.length && !missingPrice) setPayOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const editingLine = cart.lines.find((l) => l.key === editing) ?? null;

  // ── Cart panel (shared by desktop pane and mobile sheet) ──
  const cartPanel = (
    <div className="flex h-full min-h-0 flex-col">
      {orderMode && (
        <p className="mb-3 flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-2.5 text-sm" role="status">
          <ClipboardList className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Billing <strong className="font-mono">{orderMode.number}</strong>
            {advance > 0 && (
              <>
                {" "}
                · advance <span className="tabular">{money(advance)}</span>
              </>
            )}
          </span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => !orderMode && setCustomerOpen(true)}
          disabled={Boolean(orderMode)}
          className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-dashed border-border px-3 text-left text-sm hover:bg-surface-2"
        >
          <UserRound className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          {cart.customer ? (
            <span className="min-w-0 truncate">
              <strong>{cart.customer.name}</strong> <span className="tabular text-muted">{cart.customer.phone}</span>
            </span>
          ) : (
            <span className="text-muted">Add customer</span>
          )}
        </button>
        {cart.customer && !orderMode && (
          <button type="button" className="btn-ghost h-12 w-12 p-0" onClick={() => setCart((c) => ({ ...c, customer: null }))} aria-label="Remove customer">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ul className="-mx-1 mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto px-1" aria-label="Cart">
        {cart.lines.length === 0 && (
          <li className="flex flex-col items-center justify-center py-12 text-center text-muted">
            <ScanLine className="h-10 w-10" aria-hidden="true" />
            <p className="mt-3 font-medium text-fg">Scan or search to add items</p>
            <p className="text-sm">Press F2 to jump to search</p>
          </li>
        )}
        {cart.lines.map((l) => {
          const v = byId.get(l.variantId);
          const calc = bill.lines.find((c) => c.key === l.key);
          if (!v || !calc) return null;
          const unit = l.priceOverride ?? v.price;
          const off = calc.lineDiscount;
          return (
            <li key={l.key} className="rounded-2xl border border-border/70 p-2.5">
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => setEditing(l.key)} className="min-w-0 flex-1 rounded-xl px-1 text-left hover:bg-surface-2" aria-label={`Edit ${v.name}`}>
                  <span className="block truncate font-semibold">{v.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[lineLabel(v), v.priceAtCounter && unit <= 0 ? "Tap to enter price" : `${money(unit)} each`].filter(Boolean).join(" · ")}
                    {l.priceOverride !== null && l.priceOverride !== v.price && v.price > 0 && <span className="text-warning"> · price changed</span>}
                  </span>
                  {off > 0 && <span className="tabular block text-xs text-success">− {money(off)} discount</span>}
                  {l.note && <span className="block truncate text-xs italic text-muted">{l.note}</span>}
                </button>
                <span className={cn("tabular pt-0.5 text-right font-semibold", unit <= 0 && "text-danger")}>{money(calc.net)}</span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <button type="button" className="btn-ghost h-11 w-11 border border-border p-0" onClick={() => (l.qty > 1 ? updateLine(l.key, { qty: l.qty - 1 }) : removeLine(l.key))} aria-label={l.qty > 1 ? `One less ${v.name}` : `Remove ${v.name}`}>
                  {l.qty > 1 ? <Minus className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                </button>
                <span className="tabular w-10 text-center font-semibold" aria-label={`Quantity ${l.qty}`}>
                  {l.qty}
                </span>
                <button
                  type="button"
                  className="btn-ghost h-11 w-11 border border-border p-0"
                  onClick={() => (canSell(v) ? updateLine(l.key, { qty: Math.min(999, l.qty + 1) }) : flash("No more stock"))}
                  aria-label={`One more ${v.name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button type="button" className="btn-ghost ml-auto h-11 px-3 text-xs" onClick={() => setEditing(l.key)}>
                  Price / discount
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 space-y-3 border-t border-border/70 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Bill discount</span>
            <input
              className="input h-11"
              placeholder="10% or ₹"
              value={cart.billDiscount}
              onChange={(e) => setCart((c) => ({ ...c, billDiscount: e.target.value.replace(/[^\d.%]/g, "") }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Salesperson</span>
            <select className="input h-11" value={cart.salespersonId ?? ""} onChange={(e) => setCart((c) => ({ ...c, salespersonId: e.target.value || null }))}>
              <option value="">—</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-muted">
            <dt>
              Items <span className="tabular">({bill.itemCount})</span>
            </dt>
            <dd className="tabular">{money(bill.gross)}</dd>
          </div>
          {bill.discountTotal > 0 && (
            <div className="flex justify-between text-success">
              <dt>Discount</dt>
              <dd className="tabular">− {money(bill.discountTotal)}</dd>
            </div>
          )}
          <details className="group">
            <summary className="flex cursor-pointer list-none justify-between text-muted">
              <span>GST (incl.)</span>
              <span className="tabular">{money(bill.tax)}</span>
            </summary>
            <div className="mt-1 space-y-0.5 pl-3 text-xs text-muted">
              {bill.taxRows.map((r) => (
                <p key={r.rateBp} className="tabular flex justify-between">
                  <span>
                    {r.rateBp / 100}% on {money(r.taxable)}
                  </span>
                  <span>
                    CGST {money(r.cgst)} · SGST {money(r.sgst)}
                  </span>
                </p>
              ))}
            </div>
          </details>
          {bill.roundOff !== 0 && (
            <div className="flex justify-between text-muted">
              <dt>Round off</dt>
              <dd className="tabular">{money(bill.roundOff)}</dd>
            </div>
          )}
          {advance > 0 && (
            <>
              <div className="flex justify-between text-muted">
                <dt>Bill total</dt>
                <dd className="tabular">{money(bill.payable)}</dd>
              </div>
              <div className="flex justify-between text-success">
                <dt>Advance paid</dt>
                <dd className="tabular">− {money(Math.min(advance, bill.payable))}</dd>
              </div>
            </>
          )}
          <div className="flex items-end justify-between pt-1">
            <dt className="text-base font-semibold">To pay</dt>
            <dd className="tabular text-3xl font-bold tracking-tight">{money(toPay)}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-[auto_auto_1fr] gap-2">
          <button type="button" className="btn-outline h-14 px-4" onClick={hold} disabled={!cart.lines.length || busy || Boolean(orderMode)} title="Hold bill (F4)">
            <PauseCircle className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Hold</span>
          </button>
          <button type="button" className="btn-ghost h-14 px-4" onClick={clear} disabled={!cart.lines.length} aria-label="Clear bill">
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="btn-primary h-14 text-base"
            disabled={!cart.lines.length || missingPrice}
            onClick={() => {
              setPayError("");
              setPayOpen(true);
            }}
            title="Pay (F8)"
          >
            {missingPrice ? "Enter missing price" : `Pay ${money(toPay)}`}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      {/* Left: search + results */}
      <section className="card min-w-0 p-4 sm:p-5">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Scan barcode or search products</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              ref={searchRef}
              autoFocus
              type="search"
              inputMode="search"
              autoComplete="off"
              className="input h-14 pl-12 text-lg"
              placeholder="Scan barcode or search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
            />
          </label>
          <button type="button" className="btn-outline relative h-14 px-4" onClick={() => setHeldOpen(true)} aria-label={`Held bills (${held.length})`}>
            <PauseCircle className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Held</span>
            {held.length > 0 && (
              <span className="tabular absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-fg">{held.length}</span>
            )}
          </button>
        </div>

        <div aria-live="polite" className="sr-only">
          {toast}
        </div>

        {catalogue.length === 0 ? (
          <div className="py-16 text-center text-muted">
            <ShoppingBag className="mx-auto h-10 w-10" aria-hidden="true" />
            <p className="mt-3 font-medium text-fg">No products yet</p>
            <p className="text-sm">Add products first, then come back to bill.</p>
          </div>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-muted">No match for “{query}”.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" aria-label="Products">
            {results.map((group) => {
              const all = catalogue.filter((v) => v.itemId === group[0].itemId);
              const v = group[0];
              const prices = all.map((x) => x.price);
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              const stock = all.reduce((s, x) => s + Math.max(0, x.available), 0);
              const tracks = v.type === "GOODS" || v.type === "RENTAL";
              const status = !tracks ? "NO_STOCK" : stock <= 0 ? "OUT" : all.some((x) => stockStatus(x.type, { onHand: x.available, reserved: 0, inAlteration: 0, damaged: 0, reorderLevel: x.reorderLevel }) !== "IN_STOCK") ? "LOW" : "IN_STOCK";
              const colours = [...new Set(all.map((x) => colourSwatch(x.colour)).filter(Boolean))].slice(0, 5) as string[];
              return (
                <li key={v.itemId}>
                  <button
                    type="button"
                    onClick={() => pickGroup(group)}
                    className="flex h-full min-h-[120px] w-full flex-col justify-between gap-2 rounded-2xl border border-border/70 p-3 text-left transition duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card active:scale-[0.98]"
                  >
                    <span>
                      <span className="line-clamp-2 font-semibold leading-snug">{v.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{all.length > 1 ? `${all.length} options` : lineLabel(v) || v.category || " "}</span>
                    </span>
                    {colours.length > 0 && (
                      <span className="flex gap-1" aria-hidden="true">
                        {colours.map((c) => (
                          <span key={c} className="h-3 w-3 rounded-full border border-black/10" style={{ background: c }} />
                        ))}
                      </span>
                    )}
                    <span className="flex flex-wrap items-center justify-between gap-1">
                      <span className="tabular text-sm font-bold">{v.priceAtCounter && max === 0 ? "At counter" : min === max ? money(min) : `${money(min)}+`}</span>
                      <StockPill status={status} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Right: cart (desktop) */}
      <aside className="card sticky top-4 hidden h-[calc(100dvh-12rem)] min-h-[520px] flex-col p-4 lg:flex" aria-label="Current bill">
        {cartPanel}
      </aside>

      {/* Mobile: bottom bar + sheet */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <button type="button" onClick={() => setCartOpen(true)} className="btn-primary h-14 w-full justify-between px-5 text-base">
          <span className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5" aria-hidden="true" />
            <span className="tabular">{bill.itemCount} item{bill.itemCount === 1 ? "" : "s"}</span>
          </span>
          <span className="tabular flex items-center gap-2 font-bold">
            {money(toPay)} <ChevronUp className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>
      </div>
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <Sheet open={cartOpen} onClose={() => setCartOpen(false)} title="Current bill" size="md">
        <div className="flex h-[72dvh] flex-col">{cartPanel}</div>
      </Sheet>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-6" aria-hidden="true">
          <p className="rounded-full bg-fg px-5 py-3 text-sm font-medium text-bg shadow-xl">{toast}</p>
        </div>
      )}

      <VariantPicker
        variants={picker}
        allowNegative={settings.allowNegativeStock}
        onClose={() => {
          setPicker(null);
          focusSearch();
        }}
        onPick={(v) => {
          if (!canSell(v)) return flash("No more stock");
          add(v);
          setPicker(null);
        }}
      />
      <LineEditor
        line={editingLine}
        variant={editingLine ? byId.get(editingLine.variantId) : undefined}
        onSave={(patch) => editingLine && updateLine(editingLine.key, patch)}
        onRemove={() => editingLine && removeLine(editingLine.key)}
        onClose={() => {
          setEditing(null);
          focusSearch();
        }}
      />
      <CustomerPicker
        open={customerOpen}
        canCreate={settings.canCreateCustomer}
        onClose={() => setCustomerOpen(false)}
        onPick={(c) => {
          setCart((s) => ({ ...s, customer: c }));
          setCustomerOpen(false);
          focusSearch();
        }}
      />
      <PayDialog
        open={payOpen}
        payable={toPay}
        shopName={settings.shopName}
        upiId={settings.upiId}
        hasCustomer={Boolean(cart.customer)}
        busy={busy}
        error={payError}
        onPay={(p) => submit(p)}
        onClose={() => setPayOpen(false)}
      />
      <ApprovalDialog
        open={Boolean(approval)}
        reason={approval?.reason ?? ""}
        approvers={approvers}
        onClose={() => setApproval(null)}
        onApprove={(a) => approval && submit(approval.payments, a)}
      />
      <Sheet open={heldOpen} onClose={() => setHeldOpen(false)} title="Held bills" description="Resume a parked bill on this counter.">
        {held.length === 0 ? (
          <p className="py-6 text-center text-muted">No held bills.</p>
        ) : (
          <ul className="space-y-2">
            {held.map((h) => {
              const count = h.payload.lines.reduce((s, l) => s + l.qty, 0);
              return (
                <li key={h.id} className="flex items-center gap-2 rounded-2xl border border-border/70 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{h.label}</p>
                    <p className="text-sm text-muted">
                      <span className="tabular">{count}</span> item{count === 1 ? "" : "s"} · {new Date(h.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      {h.by && ` · ${h.by}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost h-11 w-11 p-0"
                    aria-label={`Discard ${h.label}`}
                    onClick={() =>
                      startBusy(async () => {
                        await discardHeldAction(h.id);
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button type="button" className="btn-primary h-11" onClick={() => resume(h)} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Resume"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
