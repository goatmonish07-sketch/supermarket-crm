import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import clsx from "clsx";

export default function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  tone = "violet",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  tone?: "violet" | "amber" | "emerald" | "rose" | "blue";
}) {
  const tones: Record<string, string> = {
    violet: "bg-violet-100 text-violet-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
    rose: "bg-rose-100 text-rose-600",
    blue: "bg-blue-100 text-blue-600",
  };
  const up = (delta ?? 0) >= 0;

  return (
    <div className="card card-pad transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div className={clsx("grid h-11 w-11 place-items-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {delta !== undefined && (
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold",
              up ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink tnum">{value}</p>
      {deltaLabel && <p className="mt-0.5 text-xs text-ink-muted">{deltaLabel}</p>}
    </div>
  );
}
