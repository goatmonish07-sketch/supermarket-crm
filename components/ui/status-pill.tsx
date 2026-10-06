import { cn } from "@/lib/utils";

export type PillTone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

const TONES: Record<PillTone, string> = {
  success: "border-success/50 text-success bg-success/5",
  warning: "border-warning/50 text-warning bg-warning/5",
  danger: "border-danger/50 text-danger bg-danger/5",
  info: "border-info/50 text-info bg-info/5",
  primary: "border-primary/50 text-primary bg-primary/5",
  neutral: "border-border text-muted bg-surface-2",
};

/** Shared status badge used for every document status (orders, jobs, stock, staff…). */
export function StatusPill({ tone, children, className }: { tone: PillTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-lg border px-2.5 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}
