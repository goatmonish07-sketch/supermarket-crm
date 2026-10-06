import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="aura-pattern relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <span className="inline-flex items-center gap-3 text-2xl font-bold">
          <span className="rounded-2xl bg-white/10 p-1.5 backdrop-blur">
            <Logo showText={false} />
          </span>
          AuraPOS
        </span>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">Your whole boutique, in one calm screen.</h2>
          <p className="mt-4 max-w-md text-white/75">
            Billing, stock by size and colour, alterations, orders and monthly reports — built for fashion stores.
          </p>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} AuraPOS</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
