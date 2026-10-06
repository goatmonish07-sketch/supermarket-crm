"use client";

import { useActionState } from "react";
import type { Store } from "@prisma/client";
import { Field, FormError, SubmitButton } from "@/app/(auth)/form-bits";
import { saveBillingAction } from "./actions";

const PAPERS = [
  { id: "THERMAL_58", label: "Thermal 58 mm" },
  { id: "THERMAL_80", label: "Thermal 80 mm" },
  { id: "A5", label: "A5 invoice" },
  { id: "A4", label: "A4 invoice" },
];

export function BillingForm({ store }: { store: Store }) {
  const [state, action] = useActionState(saveBillingAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      {state?.ok && (
        <p role="status" className="rounded-2xl bg-primary-soft px-4 py-3 text-sm">
          {state.ok}
        </p>
      )}
      <fieldset>
        <legend className="label">Default receipt paper</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PAPERS.map((p) => (
            <label key={p.id} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 border-border px-3 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
              <input type="radio" name="receiptPaper" value={p.id} defaultChecked={store.receiptPaper === p.id} className="accent-[rgb(var(--primary))]" />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field name="receiptFooter" label="Thank-you line" defaultValue={store.receiptFooter ?? ""} maxLength={200} />
      <Field name="returnPolicy" label="Return policy (printed on bills)" defaultValue={store.returnPolicy ?? ""} maxLength={300} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="cashierMaxDiscount"
          type="number"
          min={0}
          max={100}
          step="0.5"
          label="Cashier discount limit (%)"
          defaultValue={store.cashierMaxDiscountBp / 100}
          hint="Above this a manager PIN is needed."
          required
        />
        <Field
          name="monthlyTarget"
          type="number"
          min={0}
          step="1"
          label="Monthly sales target (₹)"
          defaultValue={store.monthlyTarget != null ? store.monthlyTarget / 100 : ""}
          hint="Shown on the dashboard gauge."
        />
      </div>
      <div className="space-y-2">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="roundOff" defaultChecked={store.roundOff} className="h-5 w-5 accent-[rgb(var(--primary))]" />
          Round bill totals to the nearest rupee
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="allowNegativeStock" defaultChecked={store.allowNegativeStock} className="h-5 w-5 accent-[rgb(var(--primary))]" />
          Allow selling when stock shows zero
        </label>
      </div>
      <SubmitButton>Save billing settings</SubmitButton>
    </form>
  );
}
