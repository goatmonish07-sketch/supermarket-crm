// Currency, number & date formatting (India / INR defaults).

export const GST_SLABS = [0, 5, 12, 18, 28] as const;

export function formatINR(value: number, opts?: { compact?: boolean; decimals?: number }): string {
  const n = Number.isFinite(value) ? value : 0;
  if (opts?.compact) {
    return "₹" + compactNumber(n);
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts?.decimals ?? 2,
    minimumFractionDigits: opts?.decimals ?? 2,
  }).format(n);
}

/** Compact Indian format: 1,58,620 -> 1.59L, 8,92,300 -> 8.92L, 1,20,00,000 -> 1.2Cr */
export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return (n / 1_00_00_000).toFixed(2).replace(/\.00$/, "") + "Cr";
  if (abs >= 1_00_000) return (n / 1_00_000).toFixed(2).replace(/\.00$/, "") + "L";
  if (abs >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatDate(d: Date | string, withTime = false): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}
