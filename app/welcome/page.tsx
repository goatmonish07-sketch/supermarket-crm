import Link from "next/link";
import {
  ShoppingCart, ReceiptText, Package, Users, BarChart3, ShieldCheck, NotebookPen,
  ArrowRight, Check, Star, IndianRupee, Wallet, PackageX, TrendingUp, Store, Zap,
} from "lucide-react";

export default function WelcomePage() {
  const features = [
    { icon: ReceiptText, title: "Billing & POS", desc: "Cart-based billing with GST (CGST/SGST), discounts, UPI/Cash/Card/Khata and instant printable invoices." },
    { icon: Package, title: "Smart Inventory", desc: "Track stock in real time, get low-stock alerts, manage categories and restock with a full audit trail." },
    { icon: Users, title: "Customers & Loyalty", desc: "Customer profiles, purchase history, auto loyalty points and khata / dues tracking." },
    { icon: BarChart3, title: "Reports & Analytics", desc: "Revenue trends, GST collected, top products and sales by category — exportable to CSV." },
    { icon: ShieldCheck, title: "Roles & Staff", desc: "Admin and Cashier roles with secure login, so every staff member sees exactly what they should." },
    { icon: NotebookPen, title: "Khata / Dues", desc: "Give credit to trusted customers and collect dues later — never lose track of who owes what." },
  ];

  const stats = [
    { value: "GST-ready", label: "0/5/12/18/28% slabs" },
    { value: "₹ INR", label: "Built for India" },
    { value: "Real-time", label: "Live stock & sales" },
    { value: "Secure", label: "Role-based access" },
  ];

  return (
    <div className="min-h-dvh bg-surface-sunken text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-violet-100/70 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-card">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-extrabold leading-none">SuperMart</p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-violet-500">CRM</p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
            <a href="#features" className="hover:text-violet-600">Features</a>
            <a href="#preview" className="hover:text-violet-600">Dashboard</a>
            <a href="#pricing" className="hover:text-violet-600">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">Log in</Link>
            <Link href="/login" className="btn-primary btn-sm">Get Started <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-16 text-center sm:px-6 sm:pt-24">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-surface px-4 py-1.5 text-xs font-semibold text-violet-700 shadow-card">
            <Zap className="h-3.5 w-3.5" /> The all-in-one CRM for supermarkets
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            Run your supermarket,<br />
            <span className="bg-brand-gradient bg-clip-text text-transparent">beautifully.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-ink-soft sm:text-lg">
            Billing, inventory, customer loyalty and live analytics — everything your store needs in one elegant, GST-ready dashboard.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login" className="btn-primary h-12 px-6 text-base">Start Billing Now <ArrowRight className="h-5 w-5" /></Link>
            <a href="#preview" className="btn-outline h-12 px-6 text-base">See the dashboard</a>
          </div>
          <p className="mt-4 text-xs text-ink-muted">Demo login: <span className="font-semibold text-ink-soft">admin@shop.com / admin123</span></p>
        </div>

        {/* Dashboard preview */}
        <div id="preview" className="relative mx-auto mt-6 max-w-5xl px-4 pb-16 sm:px-6">
          <div className="rounded-3xl border border-violet-100 bg-surface p-3 shadow-pop sm:p-4">
            <div className="rounded-2xl bg-surface-sunken p-4 sm:p-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <PreviewStat icon={Wallet} label="Today's Sales" value="₹1.24L" tone="violet" up="12.5%" />
                <PreviewStat icon={IndianRupee} label="Revenue (7d)" value="₹8.92L" tone="emerald" up="18.6%" />
                <PreviewStat icon={Users} label="Customers" value="3,250" tone="blue" up="8.3%" />
                <PreviewStat icon={PackageX} label="Low Stock" value="18" tone="rose" />
              </div>
              {/* Chart mock */}
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="card card-pad lg:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-ink">Revenue Trend</p>
                    <span className="badge-violet">Last 7 days</span>
                  </div>
                  <svg viewBox="0 0 400 120" className="h-28 w-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c5cfc" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#7c5cfc" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <path d="M0,90 L60,70 L120,80 L180,45 L240,60 L300,35 L400,15 L400,120 L0,120 Z" fill="url(#g)" />
                    <path d="M0,90 L60,70 L120,80 L180,45 L240,60 L300,35 L400,15" fill="none" stroke="#7c5cfc" strokeWidth="2.5" />
                  </svg>
                </div>
                <div className="card card-pad">
                  <p className="mb-3 text-sm font-bold text-ink">Payment Split</p>
                  <div className="space-y-2.5">
                    {[["UPI", "38.7%", "#7c5cfc"], ["Cash", "31.9%", "#a78bfa"], ["Card", "18.5%", "#c4b5fd"], ["Khata", "10.9%", "#ddd6fe"]].map(([n, p, c]) => (
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                        <span className="flex-1 font-medium text-ink-soft">{n}</span>
                        <span className="font-semibold text-ink">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-violet-100 bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-violet-600">{s.value}</p>
              <p className="mt-1 text-xs text-ink-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">Everything you need</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">One dashboard to run the whole store</h2>
          <p className="mt-3 text-ink-soft">From the billing counter to the back office — SuperMart CRM handles it all.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card card-pad transition-all hover:-translate-y-1 hover:shadow-card-hover">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white shadow-card">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Split highlight */}
      <section className="bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">Fast billing</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Ring up a sale in seconds</h2>
            <p className="mt-4 text-ink-soft">Search products by name or barcode, add to cart, apply discounts, pick a payment mode and print — GST is calculated automatically and stock updates instantly.</p>
            <ul className="mt-6 space-y-3">
              {["Auto GST with CGST + SGST split", "Stock decremented on every sale", "Loyalty points awarded automatically", "Credit / khata for trusted customers"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm font-medium text-ink-soft">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-success/15 text-success"><Check className="h-3.5 w-3.5" /></span>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/login" className="btn-primary mt-8"><ShoppingCart className="h-4 w-4" /> Open the POS</Link>
          </div>
          <div className="card card-pad">
            <div className="flex items-center justify-between border-b border-violet-100 pb-3">
              <p className="flex items-center gap-2 font-bold text-ink"><ShoppingCart className="h-5 w-5 text-violet-500" /> Current Bill</p>
              <span className="badge-violet">3 items</span>
            </div>
            <div className="space-y-2 py-3">
              {[["India Gate Basmati 5kg", "₹560"], ["Amul Toned Milk 1L", "₹132"], ["Tata Salt 1kg", "₹56"]].map(([n, p]) => (
                <div key={n} className="flex items-center justify-between rounded-xl bg-surface-sunken p-2.5 text-sm">
                  <span className="font-medium text-ink">{n}</span><span className="font-semibold text-ink tnum">{p}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-violet-100 pt-3 text-sm">
              <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span className="tnum">₹748</span></div>
              <div className="flex justify-between text-ink-muted"><span>GST</span><span className="tnum">₹37.40</span></div>
              <div className="flex items-center justify-between rounded-xl bg-brand-soft px-3 py-2.5">
                <span className="font-bold text-ink">Grand Total</span>
                <span className="text-lg font-extrabold text-violet-600 tnum">₹785.40</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / CTA */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-sidebar-gradient px-6 py-14 text-center text-white shadow-pop sm:px-12">
          <div className="mx-auto mb-4 flex w-fit items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />)}
            <span className="ml-1 text-violet-100">Loved by local shops</span>
          </div>
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to modernize your store?</h2>
          <p className="mx-auto mt-3 max-w-lg text-violet-100/80">Start billing, tracking stock and delighting customers today — no setup fees, no hardware required.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login" className="btn h-12 bg-white px-6 text-base font-bold text-violet-700 hover:bg-violet-50">Get Started Free</Link>
            <a href="#features" className="btn h-12 border border-white/30 px-6 text-base font-semibold text-white hover:bg-white/10">Explore features</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-violet-100 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-white"><Store className="h-4 w-4" /></div>
            <span className="text-sm font-bold text-ink">SuperMart CRM</span>
          </div>
          <p className="text-xs text-ink-muted">© {new Date().getFullYear()} SuperMart CRM · Built for supermarkets in India</p>
          <div className="flex items-center gap-4 text-sm font-medium text-ink-soft">
            <a href="#features" className="hover:text-violet-600">Features</a>
            <Link href="/login" className="hover:text-violet-600">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PreviewStat({ icon: Icon, label, value, tone, up }: { icon: any; label: string; value: string; tone: string; up?: string }) {
  const tones: Record<string, string> = {
    violet: "bg-violet-100 text-violet-600", emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600", rose: "bg-rose-100 text-rose-600",
  };
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
        {up && <span className="badge-success text-[10px]"><TrendingUp className="h-3 w-3" /> {up}</span>}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-lg font-extrabold text-ink tnum">{value}</p>
    </div>
  );
}
