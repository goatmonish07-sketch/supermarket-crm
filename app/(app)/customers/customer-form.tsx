"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/app/(auth)/form-bits";
import { saveCustomerAction } from "./actions";

type Initial = { id?: string; name: string; phone: string; email: string; birthday: string; notes: string };

export function CustomerForm({ initial }: { initial: Initial }) {
  const [state, action] = useActionState(saveCustomerAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <FormError message={state?.error} />
      {state?.ok && (
        <p role="status" className="rounded-2xl bg-primary-soft px-4 py-3 text-sm">
          {state.ok}
        </p>
      )}
      <Field name="name" label="Name" required defaultValue={initial.name} autoComplete="off" />
      <Field name="phone" type="tel" inputMode="tel" label="Mobile" required defaultValue={initial.phone} autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" type="email" label="Email" defaultValue={initial.email} autoComplete="off" />
        <Field name="birthday" type="date" label="Birthday" defaultValue={initial.birthday} />
      </div>
      <div>
        <label htmlFor="notes" className="label">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} className="input h-auto py-3" defaultValue={initial.notes} placeholder="Preferences, sizes, measurements…" />
      </div>
      <SubmitButton>{initial.id ? "Save changes" : "Add customer"}</SubmitButton>
    </form>
  );
}
