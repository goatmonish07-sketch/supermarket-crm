"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Ruler } from "lucide-react";
import { MEASUREMENT_TEMPLATES } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { saveMeasurementAction } from "@/app/(app)/orders/actions";

type Saved = { id: string; label: string; values: Record<string, number>; notes: string | null; date: string; by: string | null };

export function Measurements({ customerId, saved, canEdit }: { customerId: string; saved: Saved[]; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState(Object.keys(MEASUREMENT_TEMPLATES)[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // Start a new set from the latest one of the same garment, so only changes need typing.
  const pick = (t: string) => {
    setTemplate(t);
    const last = saved.find((s) => s.label === t);
    setValues(last ? Object.fromEntries(Object.entries(last.values).map(([k, v]) => [k, String(v)])) : {});
  };

  const save = () =>
    start(async () => {
      setError("");
      const parsed = Object.fromEntries(
        Object.entries(values)
          .map(([k, v]) => [k, Number(v)] as const)
          .filter(([, v]) => Number.isFinite(v) && v > 0),
      );
      const r = await saveMeasurementAction({ customerId, label: template, values: parsed, notes: notes || undefined });
      if (r.ok) {
        setOpen(false);
        setValues({});
        setNotes("");
        router.refresh();
      } else setError(r.error);
    });

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Ruler className="h-5 w-5 text-primary" aria-hidden="true" /> Measurements
        </h2>
        {canEdit && (
          <button
            type="button"
            className="btn-outline h-11"
            onClick={() => {
              pick(template);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> New
          </button>
        )}
      </div>
      {saved.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No measurements yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {saved.map((m) => (
            <li key={m.id} className="rounded-2xl border border-border/70 p-3">
              <p className="flex justify-between font-semibold">
                {m.label}
                <span className="text-xs font-normal text-muted">
                  {m.date}
                  {m.by && ` · ${m.by}`}
                </span>
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {Object.entries(m.values).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="truncate text-muted">{k}</dt>
                    <dd className="tabular font-semibold">{v}&quot;</dd>
                  </div>
                ))}
              </dl>
              {m.notes && <p className="mt-1 text-sm italic text-muted">{m.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="New measurements" description="In inches. Starts from the last set for this garment.">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Garment">
            {Object.keys(MEASUREMENT_TEMPLATES).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={template === t}
                onClick={() => pick(t)}
                className={cn("h-10 rounded-full border px-4 text-sm", template === t ? "border-fg bg-fg text-bg" : "border-border")}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(MEASUREMENT_TEMPLATES[template] ?? []).map((f) => (
              <label key={f} className="block">
                <span className="mb-1 block text-xs text-muted">{f}</span>
                <input className="input tabular h-11" inputMode="decimal" value={values[f] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value.replace(/[^\d.]/g, "") }))} />
              </label>
            ))}
          </div>
          <input className="input" placeholder="Notes" aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button type="button" className="btn-primary h-12 w-full" disabled={pending} onClick={save}>
            Save measurements
          </button>
        </div>
      </Sheet>
    </section>
  );
}
