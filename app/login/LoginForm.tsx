"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, Loader2, ShieldCheck, TrendingUp, Users } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/dashboard";

  const [email, setEmail] = useState("admin@shop.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }
      router.replace(from);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function quickFill(role: "admin" | "cashier") {
    if (role === "admin") {
      setEmail("admin@shop.com");
      setPassword("admin123");
    } else {
      setEmail("cashier@shop.com");
      setPassword("cashier123");
    }
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-surface-sunken">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-sidebar-gradient p-12 text-white">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient shadow-sidebar">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-none">SuperMart</p>
            <p className="text-xs font-medium tracking-widest text-violet-200">CRM</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight">
            Run your supermarket,<br />
            <span className="text-violet-300">beautifully.</span>
          </h1>
          <p className="max-w-md text-violet-100/80">
            Billing, inventory, customer loyalty and live analytics — all in one elegant dashboard.
          </p>
          <div className="grid gap-3 pt-2">
            {[
              [TrendingUp, "Real-time sales & GST-ready billing"],
              [Users, "Customer loyalty & khata / dues tracking"],
              [ShieldCheck, "Role-based access for staff"],
            ].map(([Icon, text], i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-violet-100/90">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </div>
                {text as string}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-violet-200/60">© {new Date().getFullYear()} SuperMart CRM. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white shadow-card">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-extrabold leading-none text-ink">SuperMart</p>
              <p className="text-xs font-semibold tracking-widest text-violet-500">CRM</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-ink">Welcome back 👋</h2>
          <p className="mt-1 text-sm text-ink-muted">Sign in to continue to your dashboard.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email" type="email" autoComplete="email" required
                className="input" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shop.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password" type="password" autoComplete="current-password" required
                className="input" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-violet-100 bg-brand-softer p-4">
            <p className="text-xs font-semibold text-ink-soft">Demo accounts — tap to fill</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => quickFill("admin")} className="btn-soft btn-sm flex-1">Admin</button>
              <button onClick={() => quickFill("cashier")} className="btn-outline btn-sm flex-1">Cashier</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
