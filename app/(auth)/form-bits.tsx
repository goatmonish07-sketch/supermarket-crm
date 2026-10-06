"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-12 w-full text-[15px]" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      {message}
    </p>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function Field({ label, hint, type, ...props }: FieldProps) {
  const [reveal, setReveal] = useState(false);
  const id = props.id ?? props.name;
  const isSecret = type === "password";
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {props.required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isSecret && reveal ? "text" : type}
          className={isSecret ? "input pr-14" : "input"}
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...props}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-fg"
            aria-label={reveal ? `Hide ${label}` : `Show ${label}`}
            aria-pressed={reveal}
          >
            {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
