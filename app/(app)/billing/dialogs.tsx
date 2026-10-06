"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import QRCode from "qrcode";
import { Banknote, CreditCard, Delete, Landmark, Loader2, QrCode, Search, ShieldCheck, Trash2, UserPlus, Wallet } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
import { colourSwatch, stockStatus } from "@/lib/catalogue";
import { resolveDiscount, upiLink } from "@/lib/billing";
import { cn, formatMoney } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { StockPill } from "@/components/ui/stock-pill";
import { createCustomerAction, findCustomerAction } from "./actions";
import { lineLabel, type CartCustomer, type CartLine, type PosVariant, type StaffOption } from "./types";

const money = (paise: number) => formatMoney(paise);
const toPaise = (rupees: string) => {
  const n = Number(rupees.replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

// ─── Variant picker ─────────────────────────────────────────────────────────

export function VariantPicker({
  variants,
  allowNegative,
  onPick,
  onClose,
}: {
  variants: PosVariant[] | null;
  allowNegative: boolean;
  onPick: (v: PosVariant) => void;
  onClose: () => void;
}) {
  const first = variants?.[0];
  return (
    <Sheet open={Boolean(variants)} onClose={onClose} title={first?.name ?? ""} description="Choose size and colour">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {variants?.map((v) => {
          const status = stockStatus(v.type, { onHand: v.available, reserved: 0, inAlteration: 0, damaged: 0, reorderLevel: v.reorderLevel });
          const disabled = status === "OUT" && !allowNegative;
          const swatch = colourSwatch(v.colour);
          return (
            <button
              key={v.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(v)}
              className="flex min-h-[88px] flex-col items-start gap-1.5 rounded-2xl border-2 border-border p-3 text-left transition hover:border-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="flex items-center gap-2 font-semibold">
                {swatch && <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: swatch }} aria-hidden="true" />}
                {lineLabel(v) || "Standard"}
              </span>
              <span className="tabular text-sm text-muted">{v.priceAtCounter && v.price === 0 ? "Price at counter" : money(v.price)}</span>
              <StockPill status={status} qty={status === "NO_STOCK" ? undefined : Math.max(0, v.available)} />
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ─── Line editor ────────────────────────────────────────────────────────────

export function LineEditor({
  line,
  variant,
  onSave,
  onRemove,
  onClose,
}: {
  line: CartLine | null;
  variant: PosVariant | undefined;
  onSave: (patch: Partial<CartLine>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  useEffect(() => {
    if (line && variant) {
      setPrice(((line.priceOverride ?? variant.price) / 100).toString());
      setDiscount(line.discount);
      setNote(line.note);
      setQty(line.qty);
    }
  }, [line, variant]);
  if (!line || !variant) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const unit = toPaise(price) ?? variant.price;
  const off = resolveDiscount(discount, unit * qty);
  const save = () => {
    onSave({ qty, priceOverride: unit === variant.price ? null : unit, discount: discount.trim(), note: note.trim() });
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={variant.name} description={lineLabel(variant) || undefined} size="sm">
      <div className="space-y-4">
        <div>
          <p className="label">Quantity</p>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-outline h-12 w-12 p-0 text-xl" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
              −
            </button>
            <input className="input tabular h-12 w-20 text-center text-lg" inputMode="numeric" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(999, Number(e.target.value.replace(/\D/g, "")) || 1)))} aria-label="Quantity" />
            <button type="button" className="btn-outline h-12 w-12 p-0 text-xl" onClick={() => setQty((q) => Math.min(999, q + 1))} aria-label="Increase quantity">
              +
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="line-price" className="label">
            Price per piece
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
            <input id="line-price" className="input tabular pl-9" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
          {unit !== variant.price && !variant.priceAtCounter && <p className="mt-1.5 text-xs text-warning">Changed from {money(variant.price)} — may need manager approval.</p>}
        </div>
        <div>
          <label htmlFor="line-discount" className="label">
            Discount on this item
          </label>
          <input id="line-discount" className="input" placeholder="e.g. 10% or 200" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d.%]/g, ""))} />
          <div className="mt-2 flex flex-wrap gap-2">
            {["5%", "10%", "15%", "20%"].map((d) => (
              <button key={d} type="button" onClick={() => setDiscount(d)} className={cn("h-10 rounded-full border px-4 text-sm", discount === d ? "border-fg bg-fg text-bg" : "border-border")}>
                {d}
              </button>
            ))}
          </div>
          {off > 0 && <p className="tabular mt-1.5 text-xs text-muted">− {money(off)}</p>}
        </div>
        <div>
          <label htmlFor="line-note" className="label">
            Note (alteration, gift…)
          </label>
          <input id="line-note" className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="btn-danger h-12"
            onClick={() => {
              onRemove();
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
          </button>
          <button type="button" className="btn-primary h-12 flex-1" onClick={save}>
            Done
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// ─── Customer picker ────────────────────────────────────────────────────────

export function CustomerPicker({
  open,
  canCreate,
  onPick,
  onClose,
}: {
  open: boolean;
  canCreate: boolean;
  onPick: (c: CartCustomer) => void;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [results, setResults] = useState<CartCustomer[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) {
      setPhone("");
      setName("");
      setResults([]);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) return setResults([]);
    const t = setTimeout(() => start(async () => setResults(await findCustomerAction(digits))), 250);
    return () => clearTimeout(t);
  }, [phone]);

  const create = () =>
    start(async () => {
      const r = await createCustomerAction({ name, phone });
      if (r.ok) onPick(r.customer);
      else setError(r.error);
    });

  const exact = results.find((r) => r.phone === phone.replace(/\D/g, "").slice(-10));

  return (
    <Sheet open={open} onClose={onClose} title="Customer" description="Search by mobile number" size="sm">
      <div className="space-y-4">
        <label className="relative block">
          <span className="sr-only">Mobile number</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="input tabular pl-12 text-lg" type="tel" inputMode="tel" autoFocus placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {pending && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" aria-hidden="true" />}
        </label>
        {results.length > 0 && (
          <ul className="space-y-1">
            {results.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onPick(c)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface-2">
                  <Avatar name={c.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="tabular block text-sm text-muted">{c.phone}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {canCreate && !exact && phone.replace(/\D/g, "").length >= 10 && (
          <div className="space-y-3 rounded-2xl bg-surface-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="h-4 w-4" aria-hidden="true" /> New customer
            </p>
            <label htmlFor="new-customer-name" className="sr-only">
              Name
            </label>
            <input id="new-customer-name" className="input" placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <button type="button" className="btn-primary h-12 w-full" disabled={pending || name.trim().length < 2} onClick={create}>
              Add & attach
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ─── Manager approval ───────────────────────────────────────────────────────

export function ApprovalDialog({
  open,
  reason,
  approvers,
  onApprove,
  onClose,
}: {
  open: boolean;
  reason: string;
  approvers: StaffOption[];
  onApprove: (approval: { userId: string; pin: string }) => void;
  onClose: () => void;
}) {
  const [userId, setUserId] = useState(approvers[0]?.id ?? "");
  const [pin, setPin] = useState("");
  useEffect(() => {
    if (open) setPin("");
  }, [open]);
  const press = (d: string) => setPin((p) => (p.length < 6 ? p + d : p));

  return (
    <Sheet open={open} onClose={onClose} title="Manager approval" description={reason} size="sm">
      {approvers.length === 0 ? (
        <p className="text-sm text-muted">No manager has a PIN set. Ask the owner to add one in Team.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Approver">
            {approvers.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={userId === a.id}
                onClick={() => setUserId(a.id)}
                className={cn("flex h-12 items-center gap-2 rounded-full border-2 pl-1 pr-4 text-sm font-medium", userId === a.id ? "border-primary bg-primary-soft" : "border-border")}
              >
                <Avatar name={a.name} size="sm" /> {a.name}
              </button>
            ))}
          </div>
          <div className="flex justify-center gap-3" aria-label={`${pin.length} digits entered`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={cn("h-3.5 w-3.5 rounded-full border-2 border-primary", i < pin.length && "bg-primary")} />
            ))}
          </div>
          <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0"].map((d, i) =>
              d ? (
                <button key={i} type="button" onClick={() => press(d)} className="h-14 rounded-2xl bg-surface-2 text-xl font-semibold hover:bg-primary-soft active:scale-95">
                  {d}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
            <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} className="flex h-14 items-center justify-center rounded-2xl text-muted hover:bg-surface-2" aria-label="Delete digit">
              <Delete className="h-5 w-5" />
            </button>
          </div>
          <button type="button" className="btn-primary h-12 w-full" disabled={pin.length < 4 || !userId} onClick={() => onApprove({ userId, pin })}>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Approve
          </button>
        </div>
      )}
    </Sheet>
  );
}

// ─── Payment ────────────────────────────────────────────────────────────────

const METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "UPI", icon: QrCode },
  { id: "CARD", label: "Card", icon: CreditCard },
  { id: "BANK", label: "Bank", icon: Landmark },
  { id: "OTHER", label: "Other", icon: Wallet },
];

export type PaymentEntry = { method: PaymentMethod; amount: number; reference?: string };

export function PayDialog({
  open,
  payable,
  shopName,
  upiId,
  hasCustomer,
  busy,
  error,
  onPay,
  onClose,
}: {
  open: boolean;
  payable: number;
  shopName: string;
  upiId: string | null;
  hasCustomer: boolean;
  busy: boolean;
  error: string;
  onPay: (payments: PaymentEntry[]) => void;
  onClose: () => void;
}) {
  const [amounts, setAmounts] = useState<Partial<Record<PaymentMethod, string>>>({});
  const [refs, setRefs] = useState<Partial<Record<PaymentMethod, string>>>({});
  const [active, setActive] = useState<PaymentMethod>("CASH");
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (open) {
      setAmounts({ CASH: (payable / 100).toString() });
      setRefs({});
      setActive("CASH");
    }
  }, [open, payable]);

  const entries = useMemo(
    () =>
      METHODS.map((m) => ({ method: m.id, amount: toPaise(amounts[m.id] ?? "") ?? 0, reference: refs[m.id] })).filter((e) => e.amount > 0),
    [amounts, refs],
  );
  const nonCash = entries.filter((e) => e.method !== "CASH").reduce((s, e) => s + e.amount, 0);
  const cash = entries.find((e) => e.method === "CASH")?.amount ?? 0;
  const paid = nonCash + cash;
  const change = Math.max(0, paid - payable);
  const due = Math.max(0, payable - paid);
  const upiAmount = toPaise(amounts.UPI ?? "") ?? 0;

  useEffect(() => {
    if (!upiId || upiAmount <= 0) return setQr("");
    QRCode.toDataURL(upiLink(upiId, shopName, upiAmount, `Bill at ${shopName}`), { margin: 1, width: 220 }).then(setQr).catch(() => setQr(""));
  }, [upiId, upiAmount, shopName]);

  // Selecting a method moves the remaining balance onto it.
  const select = (m: PaymentMethod) => {
    setActive(m);
    if (!amounts[m]) {
      const others = entries.filter((e) => e.method !== m).reduce((s, e) => s + e.amount, 0);
      const rest = Math.max(0, payable - others);
      setAmounts((a) => ({ ...a, [m]: rest ? (rest / 100).toString() : "" }));
    }
  };
  const only = (m: PaymentMethod) => {
    setActive(m);
    setAmounts({ [m]: (payable / 100).toString() });
  };

  const quickCash = [payable, Math.ceil(payable / 10000) * 10000, Math.ceil(payable / 50000) * 50000, Math.ceil(payable / 200000) * 200000].filter(
    (v, i, arr) => v > 0 && arr.indexOf(v) === i,
  );

  return (
    <Sheet open={open} onClose={onClose} title="Payment" description={<span className="tabular text-2xl font-bold text-fg">{money(payable)}</span>} size="md">
      <div className="space-y-5">
        <div className="grid grid-cols-5 gap-2" role="tablist" aria-label="Payment method">
          {METHODS.map((m) => {
            const amt = toPaise(amounts[m.id] ?? "") ?? 0;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active === m.id}
                onClick={() => select(m.id)}
                onDoubleClick={() => only(m.id)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-xs font-semibold transition",
                  active === m.id ? "border-primary bg-primary-soft" : amt > 0 ? "border-primary/40" : "border-border hover:bg-surface-2",
                )}
              >
                <m.icon className="h-5 w-5" aria-hidden="true" />
                {m.label}
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor="pay-amount" className="label">
            {METHODS.find((m) => m.id === active)?.label} amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted">₹</span>
            <input
              id="pay-amount"
              className="input tabular h-14 pl-9 text-2xl font-semibold"
              inputMode="decimal"
              value={amounts[active] ?? ""}
              onChange={(e) => setAmounts((a) => ({ ...a, [active]: e.target.value.replace(/[^\d.]/g, "") }))}
            />
          </div>
          {active === "CASH" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {quickCash.map((v) => (
                <button key={v} type="button" className="tabular h-11 rounded-full border border-border px-4 text-sm font-medium hover:bg-surface-2" onClick={() => setAmounts((a) => ({ ...a, CASH: (v / 100).toString() }))}>
                  {money(v)}
                </button>
              ))}
            </div>
          )}
          {active !== "CASH" && (
            <input
              className="input mt-2"
              placeholder={active === "UPI" ? "UPI ref. no. (optional)" : "Reference / last 4 digits (optional)"}
              aria-label="Payment reference"
              value={refs[active] ?? ""}
              onChange={(e) => setRefs((r) => ({ ...r, [active]: e.target.value }))}
            />
          )}
          {active === "UPI" && (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center text-black">
              {upiId ? (
                qr ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt={`UPI QR for ${money(upiAmount)}`} width={200} height={200} />
                    <p className="text-sm">
                      Scan to pay <strong className="tabular">{money(upiAmount)}</strong> to {upiId}
                    </p>
                  </>
                ) : (
                  <p className="text-sm">Enter the UPI amount to show the QR.</p>
                )
              ) : (
                <p className="text-sm">Add your UPI ID in Settings to show a payment QR here.</p>
              )}
            </div>
          )}
        </div>

        <dl className="space-y-1.5 rounded-2xl bg-surface-2 p-4 text-sm">
          {entries.map((e) => (
            <div key={e.method} className="flex justify-between">
              <dt>{METHODS.find((m) => m.id === e.method)?.label}</dt>
              <dd className="tabular">{money(e.amount)}</dd>
            </div>
          ))}
          {change > 0 && (
            <div className="flex justify-between text-base font-bold text-success">
              <dt>Return change</dt>
              <dd className="tabular">{money(change)}</dd>
            </div>
          )}
          {due > 0 && (
            <div className="flex justify-between text-base font-bold text-warning">
              <dt>Still due</dt>
              <dd className="tabular">{money(due)}</dd>
            </div>
          )}
        </dl>
        {due > 0 && !hasCustomer && <p className="text-sm text-muted">To record a balance as credit (khata), add the customer first.</p>}
        {nonCash > payable && <p className="text-sm text-danger">Card / UPI amount can&apos;t be more than the bill.</p>}
        {error && (
          <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="button"
          className="btn-primary h-14 w-full text-base"
          disabled={busy || nonCash > payable || (due > 0 && !hasCustomer)}
          onClick={() => onPay(entries.map((e) => ({ method: e.method, amount: e.amount, reference: e.reference?.trim() || undefined })))}
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {due > 0 ? `Save bill · ${money(due)} on credit` : "Complete sale"}
        </button>
      </div>
    </Sheet>
  );
}
