import Link from "next/link";
import { ArrowUpRight, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  change?: { value: string; up: boolean; caption: string };
  note?: string;
  href?: string;
  featured?: boolean;
};

export function StatCard({ label, value, change, note, href = "#", featured }: Props) {
  return (
    <div
      className={cn(
        "relative flex min-h-[180px] flex-col justify-between rounded-card p-5 sm:p-6",
        featured
          ? "bg-gradient-to-br from-primary to-primary-strong text-primary-fg shadow-glow"
          : "border border-border/60 bg-surface shadow-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-medium leading-snug">{label}</p>
        <Link
          href={href}
          aria-label={`Open ${label}`}
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
            featured ? "bg-primary-fg text-primary-strong hover:scale-105" : "border-2 border-fg/80 hover:bg-surface-2",
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="tabular mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{value}</p>
      {change ? (
        <p className={cn("mt-3 flex items-center gap-2 text-xs", featured ? "text-primary-fg/80" : "text-muted")}>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-semibold",
              featured ? "border-primary-fg/50" : "border-fg/40",
            )}
          >
            {change.value}
            {change.up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
          {change.caption}
        </p>
      ) : note ? (
        <p className={cn("mt-3 text-xs font-medium", featured ? "text-primary-fg/80" : "text-primary")}>{note}</p>
      ) : null}
    </div>
  );
}
