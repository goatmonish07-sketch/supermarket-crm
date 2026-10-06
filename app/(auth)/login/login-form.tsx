"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { Field, FormError, SubmitButton } from "../form-bits";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <Field name="shop" label="Shop ID" placeholder="e.g. meera-boutique" autoComplete="organization" required defaultValue={state?.fields?.shop} />
      <Field name="email" type="email" label="Email" placeholder="you@example.com" autoComplete="email" required defaultValue={state?.fields?.email} />
      <Field name="password" type="password" label="Password" placeholder="••••••••" autoComplete="current-password" required />
      {next && <input type="hidden" name="next" value={next} />}
      <SubmitButton>Log in</SubmitButton>
    </form>
  );
}
