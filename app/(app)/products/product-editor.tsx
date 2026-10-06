"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Package, Plus, Receipt, Scissors, Shirt, Trash2, X } from "lucide-react";
import type { ItemType } from "@prisma/client";
import { COLOUR_PRESETS, GST_RATES_BP, ITEM_TYPES, SIZE_PRESETS, formatRate, tracksStock } from "@/lib/catalogue";
import { cn } from "@/lib/utils";
import { FormError } from "@/app/(auth)/form-bits";
import { saveProductAction } from "./actions";

export type EditorVariant = {
  id?: string;
  size: string;
  colour: string;
  price: string;
  mrp: string;
  cost: string;
  reorderLevel: string;
  openingStock: string;
  sku: string;
  barcode: string;
  onHand?: number;
};

export type EditorItem = {
  id?: string;
  type: ItemType;
  name: string;
  categoryName: string;
  brand: string;
  collection: string;
  description: string;
  taxCode: string;
  gstRateBp: number;
  taxInclusive: boolean;
  priceAtCounter: boolean;
  turnaroundDays: string;
  variants: EditorVariant[];
};

const TYPE_ICONS: Record<ItemType, typeof Shirt> = { GOODS: Shirt, SERVICE: Scissors, RENTAL: Package, NON_INVENTORY: Receipt };

const blankVariant = (size = "", colour = "", d?: Partial<EditorVariant>): EditorVariant => ({
  size,
  colour,
  price: d?.price ?? "",
  mrp: d?.mrp ?? "",
  cost: d?.cost ?? "",
  reorderLevel: d?.reorderLevel ?? "2",
  openingStock: "0",
  sku: "",
  barcode: "",
});

const keyOf = (v: { size: string; colour: string }) => `${v.size.trim().toLowerCase()}|${v.colour.trim().toLowerCase()}`;
const uniq = (list: string[]) => Array.from(new Set(list.filter(Boolean)));

export function ProductEditor({ initial, categories }: { initial: EditorItem; categories: string[] }) {
  const [state, action] = useActionState(saveProductAction, undefined);
  const [item, setItem] = useState(initial);
  const [rows, setRows] = useState<EditorVariant[]>(initial.variants.length ? initial.variants : [blankVariant()]);
  const initialSizes = uniq(initial.variants.map((v) => v.size));
  const initialColours = uniq(initial.variants.map((v) => v.colour));
  const [hasVariants, setHasVariants] = useState(initialSizes.length + initialColours.length > 0);
  const [sizes, setSizes] = useState<string[]>(initialSizes);
  const [colours, setColours] = useState<string[]>(initialColours);
  const [defaults, setDefaults] = useState({ price: initial.variants[0]?.price ?? "", mrp: initial.variants[0]?.mrp ?? "", cost: initial.variants[0]?.cost ?? "" });

  const stock = tracksStock(item.type);
  const isService = item.type === "SERVICE";
  const set = <K extends keyof EditorItem>(key: K, value: EditorItem[K]) => setItem((s) => ({ ...s, [key]: value }));

  // Rebuild the size × colour matrix, keeping anything already typed into existing rows.
  const rebuild = (nextSizes: string[], nextColours: string[]) => {
    setSizes(nextSizes);
    setColours(nextColours);
    const byKey = new Map(rows.map((r) => [keyOf(r), r]));
    const s = nextSizes.length ? nextSizes : [""];
    const c = nextColours.length ? nextColours : [""];
    setRows(s.flatMap((size) => c.map((colour) => byKey.get(keyOf({ size, colour })) ?? blankVariant(size, colour, defaults))));
  };

  const toggleVariants = (on: boolean) => {
    setHasVariants(on);
    if (!on) {
      const first = rows[0] ?? blankVariant();
      setSizes([]);
      setColours([]);
      setRows([{ ...first, size: "", colour: "" }]);
    }
  };

  const updateRow = (index: number, patch: Partial<EditorVariant>) => setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const applyDefaultsToAll = () => setRows((r) => r.map((row) => ({ ...row, price: defaults.price, mrp: defaults.mrp, cost: defaults.cost })));

  const singleRow = rows[0];
  const effectiveRows = hasVariants && stock ? rows : [{ ...singleRow, size: "", colour: "", price: defaults.price, mrp: defaults.mrp, cost: defaults.cost }];
  const removedCount = initial.variants.filter((v) => v.id && !effectiveRows.some((r) => r.id === v.id)).length;

  const payload = JSON.stringify({
        type: item.type,
        name: item.name,
        categoryName: item.categoryName,
        brand: item.brand,
        collection: item.collection,
        description: item.description,
        taxCode: item.taxCode,
        gstRateBp: item.gstRateBp,
        taxInclusive: item.taxInclusive,
        priceAtCounter: item.priceAtCounter,
        turnaroundDays: item.turnaroundDays === "" ? null : item.turnaroundDays,
        variants: effectiveRows.map((r) => ({
          id: r.id,
          size: r.size,
          colour: r.colour,
          sku: r.sku,
          barcode: r.barcode,
          // A service priced at the counter stores 0 as its list price.
          price: (r.price || defaults.price) || (isService && item.priceAtCounter ? "0" : ""),
          mrp: r.mrp || defaults.mrp,
          cost: r.cost || defaults.cost,
          reorderLevel: r.reorderLevel || "0",
          openingStock: stock ? r.openingStock || "0" : "0",
        })),
      });

  return (
    <form action={action} className="space-y-4 pb-28">
      {item.id && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="payload" value={payload} />

      {/* Type */}
      <section className="card">
        <h2 className="text-xl font-semibold">What are you adding?</h2>
        <div role="radiogroup" aria-label="Item type" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ITEM_TYPES.map((t) => {
            const Icon = TYPE_ICONS[t.value];
            const selected = item.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set("type", t.value)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition duration-150",
                  selected ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40 hover:bg-surface-2",
                )}
              >
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", selected ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted")}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{t.label}</span>
                  <span className="mt-0.5 block text-sm text-muted">{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Basics */}
        <section className="card space-y-4">
          <h2 className="text-xl font-semibold">Basics</h2>
          <TextInput label="Name" required value={item.name} onChange={(v) => set("name", v)} placeholder={isService ? "e.g. Blouse stitching" : "e.g. Anarkali Kurti"} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="categoryName" className="label">
                Category
              </label>
              <input
                id="categoryName"
                list="category-options"
                className="input"
                value={item.categoryName}
                onChange={(e) => set("categoryName", e.target.value)}
                placeholder="e.g. Kurtis"
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="mt-1.5 text-xs text-muted">Pick one or type a new name.</p>
            </div>
            <TextInput label="Brand" value={item.brand} onChange={(v) => set("brand", v)} placeholder="Optional" />
          </div>
          <TextInput label="Collection / season" value={item.collection} onChange={(v) => set("collection", v)} placeholder="e.g. Festive 2026" />
          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="input h-auto py-3"
              value={item.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Fabric, work, care notes…"
            />
          </div>
        </section>

        {/* Pricing & tax */}
        <section className="card space-y-4">
          <h2 className="text-xl font-semibold">Pricing & tax</h2>
          {isService && (
            <Toggle
              label="Price is decided at the counter"
              hint="Useful for alterations that depend on the work."
              checked={item.priceAtCounter}
              onChange={(v) => set("priceAtCounter", v)}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <MoneyInput
              label={hasVariants && stock ? "Default price" : "Selling price"}
              required={!(isService && item.priceAtCounter)}
              value={defaults.price}
              onChange={(v) => setDefaults((d) => ({ ...d, price: v }))}
            />
            <MoneyInput label="MRP" value={defaults.mrp} onChange={(v) => setDefaults((d) => ({ ...d, mrp: v }))} hint="Leave empty to use the price." />
            <MoneyInput label="Cost price" value={defaults.cost} onChange={(v) => setDefaults((d) => ({ ...d, cost: v }))} hint="Hidden from cashiers." />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="gst" className="label">
                GST rate
              </label>
              <select id="gst" className="input" value={item.gstRateBp} onChange={(e) => set("gstRateBp", Number(e.target.value))}>
                {GST_RATES_BP.map((bp) => (
                  <option key={bp} value={bp}>
                    {formatRate(bp)}
                  </option>
                ))}
              </select>
            </div>
            <TextInput
              label={isService ? "SAC code" : "HSN code"}
              value={item.taxCode}
              onChange={(v) => set("taxCode", v.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={isService ? "e.g. 998821" : "e.g. 6204"}
            />
            {isService ? (
              <TextInput
                label="Ready in (days)"
                value={item.turnaroundDays}
                onChange={(v) => set("turnaroundDays", v.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="e.g. 3"
              />
            ) : (
              <div className="flex items-end">
                <Toggle label="Price includes GST" checked={item.taxInclusive} onChange={(v) => set("taxInclusive", v)} />
              </div>
            )}
          </div>
          {stock && !hasVariants && (
            <div className="grid gap-4 sm:grid-cols-2">
              {singleRow.id ? (
                <ReadOnly label="Current stock" value={String(singleRow.onHand ?? 0)} hint="Change stock from Inventory." />
              ) : (
                <TextInput label="Opening stock" value={singleRow.openingStock} onChange={(v) => updateRow(0, { openingStock: v.replace(/\D/g, "") })} inputMode="numeric" />
              )}
              <TextInput
                label="Low-stock alert at"
                value={singleRow.reorderLevel}
                onChange={(v) => updateRow(0, { reorderLevel: v.replace(/\D/g, "") })}
                inputMode="numeric"
                hint="Shows “Low stock” at or below this."
              />
            </div>
          )}
        </section>
      </div>

      {/* Variants */}
      {stock && (
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Sizes & colours</h2>
              <p className="mt-1 text-sm text-muted">Each size–colour pair gets its own barcode and stock.</p>
            </div>
            <Toggle label="Comes in sizes or colours" checked={hasVariants} onChange={toggleVariants} />
          </div>

          {hasVariants && (
            <div className="mt-6 space-y-6">
              <ChipPicker
                label="Sizes"
                selected={sizes}
                groups={Object.entries(SIZE_PRESETS).map(([name, values]) => ({ name, values: [...values] }))}
                onChange={(next) => rebuild(next, colours)}
              />
              <ChipPicker
                label="Colours"
                selected={colours}
                groups={[{ name: "Colours", values: COLOUR_PRESETS.map((c) => c.name) }]}
                swatches={Object.fromEntries(COLOUR_PRESETS.map((c) => [c.name, c.hex]))}
                onChange={(next) => rebuild(sizes, next)}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
                <p className="text-sm font-medium">
                  <span className="tabular">{rows.length}</span> variant{rows.length === 1 ? "" : "s"}
                  {rows.length > 100 && <span className="ml-2 text-danger">— maximum is 100</span>}
                </p>
                <button type="button" onClick={applyDefaultsToAll} className="btn-outline h-11">
                  Use default prices for all
                </button>
              </div>

              <VariantTable rows={rows} onChange={updateRow} onRemove={(i) => setRows((r) => r.filter((_, idx) => idx !== i))} />
            </div>
          )}
          {removedCount > 0 && (
            <p className="mt-4 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-warning" role="status">
              {removedCount} existing variant{removedCount === 1 ? "" : "s"} will be archived when you save. Their stock history is kept.
            </p>
          )}
        </section>
      )}

      {/* Sticky actions */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-surface/95 px-4 py-3 backdrop-blur lg:left-[312px]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3">
          <div className="mr-auto min-w-0 flex-1">
            <FormError message={state?.error} />
          </div>
          <Link href="/products" className="btn-ghost h-12">
            Cancel
          </Link>
          <SaveButton isNew={!item.id} />
        </div>
      </div>
    </form>
  );
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-12 px-8" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
      {isNew ? "Save product" : "Save changes"}
    </button>
  );
}

// ─── Small inputs ───────────────────────────────────────────────────────────

function TextInput({
  label,
  value,
  onChange,
  hint,
  required,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required} {...rest} />
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function MoneyInput({ label, value, onChange, hint, required }: { label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean }) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
        <input
          id={id}
          className="input tabular pl-9"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          required={required}
          placeholder="0"
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ReadOnly({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="tabular flex h-12 items-center rounded-2xl border border-dashed border-border px-4 font-semibold">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-11 items-center gap-3 text-left">
      <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200", checked ? "bg-primary" : "bg-border")}>
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-6" : "translate-x-1")} />
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </button>
  );
}

function ChipPicker({
  label,
  selected,
  groups,
  swatches,
  onChange,
}: {
  label: string;
  selected: string[];
  groups: { name: string; values: string[] }[];
  swatches?: Record<string, string>;
  onChange: (next: string[]) => void;
}) {
  const [group, setGroup] = useState(groups[0].name);
  const [custom, setCustom] = useState("");
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value]);
  const addCustom = () => {
    const value = custom.trim();
    if (value && !selected.some((s) => s.toLowerCase() === value.toLowerCase())) onChange([...selected, value]);
    setCustom("");
  };
  const current = groups.find((g) => g.name === group) ?? groups[0];
  const extra = selected.filter((s) => !groups.some((g) => g.values.includes(s)));

  return (
    <fieldset>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="font-semibold">
          {label} {selected.length > 0 && <span className="tabular font-normal text-muted">· {selected.length} selected</span>}
        </legend>
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-1 rounded-full bg-surface-2 p-1" role="tablist" aria-label={`${label} presets`}>
            {groups.map((g) => (
              <button
                key={g.name}
                type="button"
                role="tab"
                aria-selected={g.name === group}
                onClick={() => setGroup(g.name)}
                className={cn("h-9 rounded-full px-3 text-xs font-medium transition", g.name === group ? "bg-surface shadow-card" : "text-muted hover:text-fg")}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[...current.values, ...extra].map((value) => {
          const on = selected.includes(value);
          const swatch = swatches?.[value];
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(value)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition duration-150",
                on ? "border-primary bg-primary text-primary-fg" : "border-border hover:border-primary/50 hover:bg-surface-2",
              )}
            >
              {swatch && <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: swatch }} aria-hidden="true" />}
              {value}
              {on && <X className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex max-w-sm gap-2">
        <label className="sr-only" htmlFor={`custom-${label}`}>
          Add a custom {label.toLowerCase().replace(/s$/, "")}
        </label>
        <input
          id={`custom-${label}`}
          className="input h-11"
          placeholder={`Add custom ${label.toLowerCase().replace(/s$/, "")}`}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button type="button" onClick={addCustom} className="btn-outline h-11 w-11 shrink-0 p-0" aria-label={`Add ${label.toLowerCase()}`}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </fieldset>
  );
}

function VariantTable({
  rows,
  onChange,
  onRemove,
}: {
  rows: EditorVariant[];
  onChange: (index: number, patch: Partial<EditorVariant>) => void;
  onRemove: (index: number) => void;
}) {
  const cell = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20";
  const name = (r: EditorVariant) => [r.size, r.colour].filter(Boolean).join(" / ") || "Standard";

  return (
    <div className="space-y-3 md:space-y-0">
      <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_1.2fr_1.4fr_44px] gap-2 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
        <span>Variant</span>
        <span>Price ₹</span>
        <span>MRP ₹</span>
        <span>Stock</span>
        <span>Alert at</span>
        <span>SKU</span>
        <span>Barcode</span>
        <span className="sr-only">Remove</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={keyOf(r) + i}
          className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 p-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_1.2fr_1.4fr_44px] md:items-center md:rounded-none md:border-0 md:border-t md:px-1 md:py-2"
        >
          <p className="col-span-2 flex items-center gap-2 font-semibold md:col-span-1">{name(r)}</p>
          <Labeled label="Price ₹">
            <input aria-label={`Price for ${name(r)}`} className={cn(cell, "tabular")} inputMode="decimal" value={r.price} onChange={(e) => onChange(i, { price: e.target.value.replace(/[^\d.]/g, "") })} />
          </Labeled>
          <Labeled label="MRP ₹">
            <input aria-label={`MRP for ${name(r)}`} className={cn(cell, "tabular")} inputMode="decimal" value={r.mrp} onChange={(e) => onChange(i, { mrp: e.target.value.replace(/[^\d.]/g, "") })} />
          </Labeled>
          <Labeled label={r.id ? "In stock" : "Opening stock"}>
            {r.id ? (
              <span className="tabular flex h-11 items-center px-3 text-sm font-semibold" title="Change stock from Inventory">
                {r.onHand ?? 0}
              </span>
            ) : (
              <input aria-label={`Opening stock for ${name(r)}`} className={cn(cell, "tabular")} inputMode="numeric" value={r.openingStock} onChange={(e) => onChange(i, { openingStock: e.target.value.replace(/\D/g, "") })} />
            )}
          </Labeled>
          <Labeled label="Alert at">
            <input aria-label={`Low-stock alert for ${name(r)}`} className={cn(cell, "tabular")} inputMode="numeric" value={r.reorderLevel} onChange={(e) => onChange(i, { reorderLevel: e.target.value.replace(/\D/g, "") })} />
          </Labeled>
          <Labeled label="SKU">
            <input aria-label={`SKU for ${name(r)}`} className={cn(cell, "font-mono text-xs uppercase")} placeholder="Auto" value={r.sku} onChange={(e) => onChange(i, { sku: e.target.value.toUpperCase() })} />
          </Labeled>
          <Labeled label="Barcode">
            <input aria-label={`Barcode for ${name(r)}`} className={cn(cell, "font-mono text-xs")} placeholder="Auto" value={r.barcode} onChange={(e) => onChange(i, { barcode: e.target.value.trim() })} />
          </Labeled>
          <button
            type="button"
            onClick={() => onRemove(i)}
            disabled={rows.length === 1}
            className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40 md:col-span-1"
            aria-label={`Remove ${name(r)}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="md:sr-only">Remove</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-xs text-muted md:hidden" aria-hidden="true">
        {label}
      </span>
      {children}
    </div>
  );
}
