"use client";

import { useActionState } from "react";
import type { Store } from "@prisma/client";
import { saveStoreAction } from "./actions";
import { Field, FormError, SubmitButton } from "@/app/(auth)/form-bits";

export function StoreForm({ store, readOnly }: { store: Store; readOnly: boolean }) {
  const [state, action] = useActionState(saveStoreAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-70">
        <FormError message={state?.error} />
        {state?.ok && <p className="rounded-2xl bg-primary-soft px-4 py-3 text-sm">{state.ok}</p>}
        <Field name="name" label="Shop name (printed on bills)" defaultValue={store.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="phone" type="tel" label="Phone" defaultValue={store.phone ?? ""} />
          <Field name="email" type="email" label="Email" defaultValue={store.email ?? ""} />
        </div>
        <Field name="address" label="Address" defaultValue={store.address ?? ""} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="city" label="City" defaultValue={store.city ?? ""} />
          <Field name="state" label="State" defaultValue={store.state ?? ""} />
          <Field name="pincode" label="Pincode" inputMode="numeric" defaultValue={store.pincode ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="gstin" label="GSTIN" placeholder="Optional" className="input uppercase" defaultValue={store.gstin ?? ""} />
          <Field name="upiId" label="UPI ID (QR on bills)" placeholder="shop@okbank" defaultValue={store.upiId ?? ""} />
          <Field name="invoicePrefix" label="Invoice prefix" className="input uppercase" defaultValue={store.invoicePrefix} required />
        </div>
        {!readOnly && <SubmitButton>Save shop details</SubmitButton>}
      </fieldset>
    </form>
  );
}
