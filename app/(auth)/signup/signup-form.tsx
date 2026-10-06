"use client";

import { useActionState } from "react";
import { signupAction } from "../actions";
import { Field, FormError, SubmitButton } from "../form-bits";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <Field name="businessName" label="Boutique name" placeholder="e.g. Meera Boutique" required defaultValue={f.businessName} />
      <Field name="ownerName" label="Your name" placeholder="e.g. Meera Iyer" autoComplete="name" required defaultValue={f.ownerName} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" type="email" label="Email" autoComplete="email" required defaultValue={f.email} />
        <Field name="phone" type="tel" label="Phone" autoComplete="tel" required defaultValue={f.phone} />
      </div>
      <Field name="password" type="password" label="Password" autoComplete="new-password" minLength={8} required hint="At least 8 characters." />
      <Field
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="\d{4,6}"
        maxLength={6}
        label="Quick PIN"
        required
        hint="4–6 digits, for switching staff at the counter."
      />
      <SubmitButton>Create my shop</SubmitButton>
    </form>
  );
}
