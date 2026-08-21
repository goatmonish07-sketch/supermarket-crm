import { Suspense } from "react";
import LoginForm from "./LoginForm";
export const runtime = "edge";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface-sunken" />}>
      <LoginForm />
    </Suspense>
  );
}
