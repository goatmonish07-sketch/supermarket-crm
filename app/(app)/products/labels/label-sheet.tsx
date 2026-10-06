"use client";

import { useMemo, useState } from "react";
import { Barcode } from "@/components/ui/barcode";
import { Minus, Plus, Printer } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";

export type LabelVariant = {
  id: string;
  name: string;
  size: string | null;
  colour: string | null;
  sku: string;
  barcode: string;
  price: number;
  mrp: number;
  onHand: number;
};

const LAYOUTS = {
  "50x25": { label: "Roll 50 × 25 mm", page: "50mm 25mm", w: "50mm", h: "25mm", sheet: false },
  "38x25": { label: "Roll 38 × 25 mm", page: "38mm 25mm", w: "38mm", h: "25mm", sheet: false },
  a4: { label: "A4 sheet · 3 × 8", page: "A4", w: "64mm", h: "33.9mm", sheet: true },
} as const;
type LayoutId = keyof typeof LAYOUTS;

export function LabelSheet({ variants, shopName }: { variants: LabelVariant[]; shopName: string }) {
  const [layout, setLayout] = useState<LayoutId>("50x25");
  const [fields, setFields] = useState({ shop: true, price: true, mrp: false, variant: true });
  const [copies, setCopies] = useState<Record<string, number>>(() => Object.fromEntries(variants.map((v) => [v.id, 1])));
  const L = LAYOUTS[layout];

  const labels = useMemo(() => variants.flatMap((v) => Array.from({ length: copies[v.id] ?? 0 }, (_, i) => ({ v, key: `${v.id}-${i}` }))), [variants, copies]);
  const total = labels.length;
  const setCopy = (id: string, n: number) => setCopies((c) => ({ ...c, [id]: Math.max(0, Math.min(500, n)) }));

  return (
    <div className="space-y-4">
      <style>{`@media print { @page { size: ${L.page}; margin: ${L.sheet ? "13mm 6mm" : "0"}; } }`}</style>

      <section className="card space-y-5 print:hidden">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="label">Label size</p>
            <div role="radiogroup" aria-label="Label size" className="flex flex-wrap gap-2">
              {(Object.keys(LAYOUTS) as LayoutId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={layout === id}
                  onClick={() => setLayout(id)}
                  className={cn("h-11 rounded-full border px-4 text-sm font-medium transition", layout === id ? "border-fg bg-fg text-bg" : "border-border hover:bg-surface-2")}
                >
                  {LAYOUTS[id].label}
                </button>
              ))}
            </div>
          </div>
          <fieldset>
            <legend className="label">Show on label</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(
                [
                  ["shop", "Shop name"],
                  ["variant", "Size / colour"],
                  ["price", "Price"],
                  ["mrp", "MRP"],
                ] as const
              ).map(([key, text]) => (
                <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[rgb(var(--primary))]"
                    checked={fields[key]}
                    onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.checked }))}
                  />
                  {text}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Copies</p>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost h-10 text-xs" onClick={() => setCopies(Object.fromEntries(variants.map((v) => [v.id, Math.max(0, v.onHand)])))}>
                Match stock
              </button>
              <button type="button" className="btn-ghost h-10 text-xs" onClick={() => setCopies(Object.fromEntries(variants.map((v) => [v.id, 1])))}>
                One each
              </button>
            </div>
          </div>
          <ul className="mt-2 max-h-80 divide-y divide-border/60 overflow-y-auto pr-1">
            {variants.map((v) => {
              const name = `${v.name}${v.size || v.colour ? ` — ${[v.size, v.colour].filter(Boolean).join(" / ")}` : ""}`;
              return (
                <li key={v.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{name}</span>
                    <span className="block font-mono text-xs text-muted">{v.barcode}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" className="btn-ghost h-11 w-11 p-0" onClick={() => setCopy(v.id, (copies[v.id] ?? 0) - 1)} aria-label={`Fewer labels for ${name}`}>
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      className="tabular h-11 w-14 rounded-xl border border-border bg-surface-2 text-center"
                      inputMode="numeric"
                      aria-label={`Copies for ${name}`}
                      value={copies[v.id] ?? 0}
                      onChange={(e) => setCopy(v.id, Number(e.target.value.replace(/\D/g, "")) || 0)}
                    />
                    <button type="button" className="btn-ghost h-11 w-11 p-0" onClick={() => setCopy(v.id, (copies[v.id] ?? 0) + 1)} aria-label={`More labels for ${name}`}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <p className="text-sm text-muted">
            <span className="tabular font-semibold text-fg">{total}</span> label{total === 1 ? "" : "s"} · preview below
          </p>
          <button type="button" onClick={() => window.print()} disabled={total === 0} className="btn-primary h-12 px-8">
            <Printer className="h-4 w-4" aria-hidden="true" /> Print labels
          </button>
        </div>
      </section>

      {/* Preview = what prints */}
      <section aria-label="Label preview" className="card print:m-0 print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div className={cn("flex flex-wrap gap-2 print:gap-0", L.sheet && "print:grid print:grid-cols-3")}>
          {labels.map(({ v, key }) => (
            <div
              key={key}
              style={{ width: L.w, height: L.h }}
              className="flex break-inside-avoid flex-col items-center justify-between overflow-hidden rounded-md border border-dashed border-border bg-white px-[2mm] py-[1.2mm] text-center text-black print:rounded-none print:border-0 [&:not(:last-child)]:print:break-after-auto"
            >
              {fields.shop && <p className="w-full truncate text-[7pt] font-bold uppercase leading-tight">{shopName}</p>}
              <p className="w-full truncate text-[7pt] leading-tight">
                {v.name}
                {fields.variant && (v.size || v.colour) ? ` · ${[v.size, v.colour].filter(Boolean).join(" / ")}` : ""}
              </p>
              <Barcode value={v.barcode} className="max-h-[60%]" />
              {(fields.price || fields.mrp) && (
                <p className="text-[8pt] font-bold leading-tight">
                  {fields.price && formatMoney(v.price)}
                  {fields.mrp && v.mrp > v.price && <span className="ml-1 font-normal line-through">{formatMoney(v.mrp)}</span>}
                  {fields.mrp && !fields.price && formatMoney(v.mrp)}
                </p>
              )}
            </div>
          ))}
          {total === 0 && <p className="py-10 text-center text-muted print:hidden">Set copies above to preview labels.</p>}
        </div>
      </section>
    </div>
  );
}
