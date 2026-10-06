import { cn } from "@/lib/utils";

/** AuraPOS mark: a halo ring around a soft "A" with a spark — original artwork. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-10 w-10", className)} aria-hidden="true">
      <defs>
        <linearGradient id="aura-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--primary))" />
          <stop offset="1" stopColor="rgb(var(--primary-strong))" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#aura-g)" />
      <circle cx="20" cy="21" r="11.5" fill="none" stroke="rgb(var(--primary-fg))" strokeOpacity="0.35" strokeWidth="1.5" />
      <path
        d="M13.5 28 19 13.5a1.1 1.1 0 0 1 2 0L26.5 28M16 22.5h8"
        fill="none"
        stroke="rgb(var(--primary-fg))"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M30 7.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="rgb(var(--accent))" />
    </svg>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark />
      {showText && (
        <span className="text-[22px] font-bold tracking-tight">
          Aura<span className="text-primary">POS</span>
        </span>
      )}
    </span>
  );
}
