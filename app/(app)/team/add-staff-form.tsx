"use client";

import { useActionState, useEffect, useRef } from "react";
import { addStaffAction } from "./actions";
import { Field, FormError, SubmitButton } from "@/app/(auth)/form-bits";

export function AddStaffForm({ roles }: { roles: { value: string; label: string }[] }) {
  const [state, action] = useActionState(addStaffAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <FormError message={state?.error} />
      {state?.ok && <p className="rounded-2xl bg-primary-soft px-4 py-3 text-sm">{state.ok}</p>}
      <Field name="name" label="Full name" placeholder="e.g. Priya Raman" required />
      <div>
        <label htmlFor="role" className="label">
          Role
        </label>
        <select id="role" name="role" className="input appearance-none" defaultValue="CASHIER">
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <Field name="phone" type="tel" label="Phone" placeholder="Optional" />
      <Field
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="\d{4,6}"
        maxLength={6}
        label="Counter PIN"
        required
        hint="4–6 digits. Used to unlock the counter."
      />
      <details className="rounded-2xl bg-surface-2 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Allow full login (email & password)</summary>
        <div className="mt-4 space-y-4">
          <Field name="email" type="email" label="Email" placeholder="Optional" />
          <Field name="password" type="password" label="Password" placeholder="Optional, 8+ characters" autoComplete="new-password" />
        </div>
      </details>
      <SubmitButton>Add staff member</SubmitButton>
    </form>
  );
}
