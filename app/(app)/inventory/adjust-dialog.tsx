"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormError, SubmitButton } from "@/app/(auth)/form-bits";
import { adjustStockAction } from "./actions";

const KINDS = [
  { value: "STOCK_IN", label: "Stock in", icon: ArrowDownToLine, reasons: ["New purchase", "Returned by customer", "Found in count", "Transfer in"] },
  { value: "STOCK_OUT", label: "Stock out", icon: ArrowUpFromLine, reasons: ["Returned to supplier", "Lost / stolen", "Given as gift", "Used in store"] },
  { value: "DAMAGED", label: "Damaged", icon: ShieldAlert, reasons: ["Stain", "Tear", "Colour fade", "Manufacturing defect"] },
  { value: "COUNT_CORRECTION", label: "Set count", icon: ClipboardCheck, reasons: ["Stock count", "Opening correction"] },
] as const;

type Props = { variantId: string; label: string; onHand: number; available: number };

export function AdjustDialog({ variantId, label, onHand, available }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(adjustStockAction, undefined);
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("STOCK_IN");
  const current = KINDS.find((k) => k.value === kind)!;

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      ref.current?.close();
    }
  }, [state]);

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="btn-outline h-11 px-4" aria-label={`Adjust stock for ${label}`}>
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Adjust</span>
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`adj-${variantId}`}
        className="m-0 mt-auto w-full max-w-none rounded-t-[2rem] bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-card"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <form ref={formRef} action={action} className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={`adj-${variantId}`} className="text-xl font-semibold">
                Adjust stock
              </h2>
              <p className="mt-1 text-sm text-muted">
                {label} · <span className="tabular">{onHand}</span> on hand, <span className="tabular">{Math.max(0, available)}</span> available
              </p>
            </div>
            <button type="button" onClick={() => ref.current?.close()} className="btn-ghost h-11 w-11 p-0" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <input type="hidden" name="variantId" value={variantId} />
          <input type="hidden" name="kind" value={kind} />
          <div role="radiogroup" aria-label="Adjustment type" className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => setKind(k.value)}
                className={cn(
                  "flex h-12 items-center gap-2 rounded-2xl border-2 px-3 text-sm font-medium transition",
                  kind === k.value ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2",
                )}
              >
                <k.icon className="h-4 w-4" aria-hidden="true" />
                {k.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor={`qty-${variantId}`} className="label">
              {kind === "COUNT_CORRECTION" ? "Counted quantity" : "Quantity"}
              <span className="text-danger" aria-hidden="true"> *</span>
            </label>
            <input id={`qty-${variantId}`} name="qty" type="number" min={0} inputMode="numeric" required className="input tabular text-lg" placeholder="0" />
          </div>
          <div>
            <label htmlFor={`reason-${variantId}`} className="label">
              Reason
            </label>
            <input id={`reason-${variantId}`} name="reason" list={`reasons-${variantId}`} className="input" placeholder="Pick or type a reason" />
            <datalist id={`reasons-${variantId}`}>
              {current.reasons.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
          <FormError message={state?.error} />
          <SubmitButton>Save adjustment</SubmitButton>
        </form>
      </dialog>
    </>
  );
}
