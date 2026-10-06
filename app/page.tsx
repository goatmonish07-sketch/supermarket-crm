import Link from "next/link";
import { BarChart3, Boxes, Palette, Printer, ReceiptText, Scissors, ShieldCheck, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const FEATURES = [
  { icon: ReceiptText, title: "Fast billing", text: "Scan, add size & colour, split payment, print or WhatsApp the bill." },
  { icon: Boxes, title: "Stock by variant", text: "Every size and colour tracked, with clear in-stock / low / reserved status." },
  { icon: Scissors, title: "Alterations & orders", text: "Job cards, measurements, trial dates and ready-for-pickup alerts." },
  { icon: Printer, title: "Your bill, your style", text: "58 / 80 mm thermal, A4 or A5, with templates and fonts you choose." },
  { icon: Users, title: "Staff & roles", text: "PIN switching at the counter, permissions per role, full activity log." },
  { icon: BarChart3, title: "Monthly reports", text: "Sales, GST, stock, staff and profit — export to Excel or PDF." },
  { icon: Palette, title: "Themes", text: "Five colour themes with light and dark mode, picked per person." },
  { icon: ShieldCheck, title: "Your data, safe", text: "Daily backups, separate data per shop, export any time." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between rounded-card bg-surface px-5 py-4 shadow-card">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Free trial
          </Link>
        </nav>
      </header>

      <section className="aura-pattern mt-6 rounded-card px-6 py-16 text-white sm:px-12 sm:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Point of sale for boutiques</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">Run your boutique with calm and clarity.</h1>
        <p className="mt-5 max-w-xl text-lg text-white/80">
          Billing, stock, alterations, customers and reports in one place — on your counter PC, tablet or phone.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn h-14 bg-white px-7 text-base text-primary-strong hover:bg-white/90">
            Start 14-day free trial
          </Link>
          <Link href="/login" className="btn h-14 border-2 border-white/60 px-7 text-base text-white hover:bg-white/10">
            Log in
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <f.icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="py-10 text-center text-sm text-muted">© {new Date().getFullYear()} AuraPOS</footer>
    </div>
  );
}
