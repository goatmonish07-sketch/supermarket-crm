"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Minus, Plus, Ruler, Search, Trash2, UserRound } from "lucide-react";
import type { OrderKind, PaymentMethod } from "@prisma/client";
import { MEASUREMENT_TEMPLATES } from "@/lib/orders";
import { cn, formatMoney } from "@/lib/utils";
import { CustomerPicker } from "@/app/(app)/billing/dialogs";
import type { CartCustomer } from "@/app/(app)/billing/types";
import { createOrderAction, customerMeasurementsAction } from "./actions";

export type FormVariant = {
  id: string;
  name: string;
  label: string;
  price: number;
  type: string;
  available: number;
  turnaroundDays: number | null;
};

type Line = { key: string; variantId: string; qty: number; price: string; note: string };
type SavedMeasurement = { id: string; label: string; values: Record<string, number>; notes: string | null; createdAt: string };

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "CASH", label: "Cash" },
  { id: "UPI", label: "UPI" },
  { id: "CARD", label: "Card" },
  { id: "BANK", label: "Bank" },
];

const toPaise = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000).toISOString().slice(0, 10);

export function OrderForm({
  kind: initialKind,
  catalogue,
  staff,
  canCreateCustomer,
  initialCustomer,
}: {
  kind: OrderKind;
  catalogue: FormVariant[];
  staff: { id: string; name: string; role: string }[];
  canCreateCustomer: boolean;
  initialCustomer: CartCustomer | null;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<OrderKind>(initialKind);
  const [customer, setCustomer] = useState<CartCustomer | null>(initialCustomer);
  const [pickCustomer, setPickCustomer] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [dueDate, setDueDate] = useState(addDays(new Date(), 7));
  const [trialDate, setTrialDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [designNotes, setDesignNotes] = useState("");
  const [saved, setSaved] = useState<SavedMeasurement[]>([]);
  const [measurementId, setMeasurementId] = useState<string>("");
  const [takeNew, setTakeNew] = useState(false);
  const [template, setTemplate] = useState(Object.keys(MEASUREMENT_TEMPLATES)[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [mNotes, setMNotes] = useState("");
  const [advance, setAdvance] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const byId = useMemo(() => new Map(catalogue.map((v) => [v.id, v])), [catalogue]);

  useEffect(() => {
    setMeasurementId("");
    setSaved([]);
    if (!customer) return;
    let alive = true;
    customerMeasurementsAction(customer.id).then((rows) => alive && setSaved(rows));
    return () => {
      alive = false;
    };
  }, [customer]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = catalogue.filter((v) => !q || `${v.name} ${v.label}`.toLowerCase().includes(q));
    // Jobs list services first.
    return [...pool].sort((a, b) => (kind === "JOB" ? Number(b.type === "SERVICE") - Number(a.type === "SERVICE") : 0)).slice(0, 12);
  }, [catalogue, query, kind]);

  const add = (v: FormVariant) => {
    setLines((ls) => [...ls, { key: `${v.id}-${Date.now()}`, variantId: v.id, qty: 1, price: v.price ? String(v.price / 100) : "", note: "" }]);
    if (v.turnaroundDays && lines.length === 0) setDueDate(addDays(new Date(), v.turnaroundDays));
    setQuery("");
  };
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const estimate = lines.reduce((s, l) => s + toPaise(l.price) * l.qty, 0);
  const advancePaise = toPaise(advance);
  const fields = MEASUREMENT_TEMPLATES[template] ?? [];

  const submit = () =>
    start(async () => {
      setError("");
      if (!customer) return setError("Choose a customer first.");
      const measured = Object.fromEntries(
        Object.entries(values)
          .map(([k, v]) => [k, Number(v)] as const)
          .filter(([, v]) => Number.isFinite(v) && v > 0),
      );
      const res = await createOrderAction({
        kind,
        customerId: customer.id,
        items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty, price: toPaise(l.price), note: l.note || undefined })),
        dueDate,
        trialDate: kind === "JOB" ? trialDate : "",
        assigneeId: assigneeId || undefined,
        deliveryMode: kind === "ORDER" ? deliveryMode : "PICKUP",
        deliveryAddress,
        notes,
        designNotes,
        measurementId: !takeNew && measurementId ? measurementId : undefined,
        newMeasurement: takeNew && Object.keys(measured).length ? { label: template, values: measured, notes: mNotes || undefined } : undefined,
        advance: advancePaise > 0 ? { method, amount: advancePaise } : undefined,
      });
      if (res.ok) router.push(`/orders/${res.id}?created=1`);
      else setError(res.error);
    });

  return (
    <div className="space-y-4 pb-28">
      <section className="card">
        <div role="radiogroup" aria-label="Type" className="grid gap-3 sm:grid-cols-2">
          {(["JOB", "ORDER"] as OrderKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn("rounded-2xl border-2 p-4 text-left transition", kind === k ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2")}
            >
              <span className="block font-semibold">{k === "JOB" ? "Alteration / stitching job" : "Customer order"}</span>
              <span className="mt-0.5 block text-sm text-muted">
                {k === "JOB" ? "Stitching, alterations, fall & pico — with measurements and trial." : "Special order, booking or home delivery — stock is held for the customer."}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="text-xl font-semibold">Customer</h2>
          <button
            type="button"
            onClick={() => setPickCustomer(true)}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 text-left hover:bg-surface-2"
          >
            <UserRound className="h-5 w-5 text-muted" aria-hidden="true" />
            {customer ? (
              <span>
                <span className="block font-semibold">{customer.name}</span>
                <span className="tabular block text-sm text-muted">{customer.phone}</span>
              </span>
            ) : (
              <span className="text-muted">
                Choose customer <span className="text-danger">*</span>
              </span>
            )}
          </button>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Due date</span>
              <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            {kind === "JOB" ? (
              <label className="block">
                <span className="label">Trial date</span>
                <input type="date" className="input" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} />
              </label>
            ) : (
              <fieldset>
                <legend className="label">Handover</legend>
                <div className="flex gap-2">
                  {(["PICKUP", "DELIVERY"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={deliveryMode === m}
                      onClick={() => setDeliveryMode(m)}
                      className={cn("h-12 flex-1 rounded-2xl border-2 text-sm font-medium", deliveryMode === m ? "border-primary bg-primary-soft" : "border-border")}
                    >
                      {m === "PICKUP" ? "Pickup" : "Home delivery"}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
          {kind === "ORDER" && deliveryMode === "DELIVERY" && (
            <label className="block">
              <span className="label">Delivery address</span>
              <textarea className="input h-auto py-3" rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
            </label>
          )}
          <label className="block">
            <span className="label">{kind === "JOB" ? "Tailor" : "Handled by"}</span>
            <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Not assigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.role}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="card space-y-4">
          <h2 className="text-xl font-semibold">{kind === "JOB" ? "Work & charges" : "Items"}</h2>
          <label className="relative block">
            <span className="sr-only">Search items and services</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input className="input pl-12" placeholder={kind === "JOB" ? "Search services, e.g. blouse stitching" : "Search products"} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {query && (
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-border/70 p-1">
              {results.length === 0 && <li className="p-3 text-sm text-muted">No match.</li>}
              {results.map((v) => (
                <li key={v.id}>
                  <button type="button" onClick={() => add(v)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{v.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {[v.label, v.type === "SERVICE" ? "Service" : `${Math.max(0, v.available)} in stock`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="tabular text-sm font-semibold">{v.price ? formatMoney(v.price) : "Set price"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ul className="space-y-2">
            {lines.length === 0 && <li className="rounded-2xl bg-surface-2 p-4 text-center text-sm text-muted">Search above to add {kind === "JOB" ? "services" : "items"}.</li>}
            {lines.map((l) => {
              const v = byId.get(l.variantId)!;
              return (
                <li key={l.key} className="rounded-2xl border border-border/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{v.name}</p>
                      {v.label && <p className="text-xs text-muted">{v.label}</p>}
                    </div>
                    <button type="button" className="btn-ghost h-11 w-11 p-0" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label={`Remove ${v.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" className="btn-ghost h-11 w-11 border border-border p-0" onClick={() => update(l.key, { qty: Math.max(1, l.qty - 1) })} aria-label="Decrease quantity">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="tabular w-8 text-center font-semibold">{l.qty}</span>
                    <button type="button" className="btn-ghost h-11 w-11 border border-border p-0" onClick={() => update(l.key, { qty: Math.min(999, l.qty + 1) })} aria-label="Increase quantity">
                      <Plus className="h-4 w-4" />
                    </button>
                    <label className="relative ml-auto w-32">
                      <span className="sr-only">Price for {v.name}</span>
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                      <input className="input tabular h-11 pl-7" inputMode="decimal" value={l.price} onChange={(e) => update(l.key, { price: e.target.value.replace(/[^\d.]/g, "") })} />
                    </label>
                  </div>
                  <input className="input mt-2 h-11" placeholder="Note (e.g. princess cut, padded)" value={l.note} onChange={(e) => update(l.key, { note: e.target.value })} aria-label={`Note for ${v.name}`} />
                </li>
              );
            })}
          </ul>
          <p className="flex justify-between border-t border-border/70 pt-3 text-lg font-semibold">
            <span>Estimate</span>
            <span className="tabular">{formatMoney(estimate)}</span>
          </p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Ruler className="h-5 w-5 text-primary" aria-hidden="true" /> Measurements
          </h2>
          {!customer ? (
            <p className="text-sm text-muted">Choose a customer to see saved measurements.</p>
          ) : (
            <>
              {saved.length > 0 && !takeNew && (
                <div role="radiogroup" aria-label="Saved measurements" className="space-y-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!measurementId}
                    onClick={() => setMeasurementId("")}
                    className={cn("w-full rounded-2xl border-2 p-3 text-left text-sm", !measurementId ? "border-primary bg-primary-soft" : "border-border")}
                  >
                    Don&apos;t attach measurements
                  </button>
                  {saved.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={measurementId === m.id}
                      onClick={() => setMeasurementId(m.id)}
                      className={cn("w-full rounded-2xl border-2 p-3 text-left", measurementId === m.id ? "border-primary bg-primary-soft" : "border-border")}
                    >
                      <span className="flex items-center justify-between font-semibold">
                        {m.label}
                        <span className="text-xs font-normal text-muted">{new Date(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </span>
                      <span className="tabular mt-1 block text-xs text-muted">
                        {Object.entries(m.values)
                          .map(([k, v]) => `${k} ${v}`)
                          .join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {saved.length === 0 && !takeNew && <p className="text-sm text-muted">No saved measurements for {customer.name}.</p>}
              <button type="button" className="btn-outline h-11" onClick={() => setTakeNew((t) => !t)}>
                {takeNew ? "Use saved instead" : "Take new measurements"}
              </button>
              {takeNew && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Garment">
                    {Object.keys(MEASUREMENT_TEMPLATES).map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={template === t}
                        onClick={() => setTemplate(t)}
                        className={cn("h-10 rounded-full border px-4 text-sm", template === t ? "border-fg bg-fg text-bg" : "border-border")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted">In inches. Leave blank what you don&apos;t need.</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {fields.map((f) => (
                      <label key={f} className="block">
                        <span className="mb-1 block text-xs text-muted">{f}</span>
                        <input className="input tabular h-11" inputMode="decimal" value={values[f] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value.replace(/[^\d.]/g, "") }))} />
                      </label>
                    ))}
                  </div>
                  <input className="input" placeholder="Measurement notes" value={mNotes} onChange={(e) => setMNotes(e.target.value)} aria-label="Measurement notes" />
                </div>
              )}
            </>
          )}
          <label className="block">
            <span className="label">Design notes</span>
            <textarea className="input h-auto py-3" rows={3} value={designNotes} onChange={(e) => setDesignNotes(e.target.value)} placeholder="Neck style, sleeves, lining, buttons, reference…" />
          </label>
        </section>

        <section className="card space-y-4">
          <h2 className="text-xl font-semibold">Advance</h2>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Advance method">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setMethod(m.id)}
                className={cn("h-12 rounded-2xl border-2 text-sm font-medium", method === m.id ? "border-primary bg-primary-soft" : "border-border")}
              >
                {m.label}
              </button>
            ))}
          </div>
          <label className="relative block">
            <span className="label">Advance received</span>
            <span className="pointer-events-none absolute bottom-3.5 left-4 text-muted">₹</span>
            <input className="input tabular pl-9" inputMode="decimal" value={advance} onChange={(e) => setAdvance(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
          </label>
          <div className="flex flex-wrap gap-2">
            {[25, 50, 100].map((pct) => (
              <button key={pct} type="button" className="h-10 rounded-full border border-border px-4 text-sm" disabled={!estimate} onClick={() => setAdvance(String(Math.round((estimate * pct) / 100) / 100))}>
                {pct}%
              </button>
            ))}
          </div>
          <dl className="space-y-1 rounded-2xl bg-surface-2 p-4 text-sm">
            <div className="flex justify-between">
              <dt>Estimate</dt>
              <dd className="tabular">{formatMoney(estimate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Advance</dt>
              <dd className="tabular">− {formatMoney(advancePaise)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Balance on delivery</dt>
              <dd className="tabular">{formatMoney(Math.max(0, estimate - advancePaise))}</dd>
            </div>
          </dl>
          <label className="block">
            <span className="label">Notes</span>
            <textarea className="input h-auto py-3" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </section>
      </div>

      <CustomerPicker
        open={pickCustomer}
        canCreate={canCreateCustomer}
        onClose={() => setPickCustomer(false)}
        onPick={(c) => {
          setCustomer(c);
          setPickCustomer(false);
        }}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:left-[312px]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3">
          {error && (
            <p role="alert" className="mr-auto rounded-2xl border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Link href="/orders" className="btn-ghost h-12">
            Cancel
          </Link>
          <button type="button" className="btn-primary h-12 px-8" disabled={pending || !lines.length || !customer} onClick={submit}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Create {kind === "JOB" ? "job" : "order"}
          </button>
        </div>
      </div>
    </div>
  );
}
