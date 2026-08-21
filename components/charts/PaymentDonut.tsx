"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatINR } from "@/lib/format";

type Slice = { mode: string; total: number };

const COLORS: Record<string, string> = {
  UPI: "#7c5cfc",
  CASH: "#a78bfa",
  CARD: "#c4b5fd",
  CREDIT: "#ddd6fe",
};

const LABELS: Record<string, string> = {
  UPI: "UPI",
  CASH: "Cash",
  CARD: "Card",
  CREDIT: "Credit / Khata",
};

export default function PaymentDonut({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);

  if (total === 0) {
    return (
      <div className="grid h-[240px] place-items-center text-sm text-ink-muted">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} dataKey="total" nameKey="mode"
              innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.mode} fill={COLORS[d.mode] || "#c4b5fd"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] font-medium text-ink-muted">Total</p>
          <p className="text-lg font-extrabold text-ink tnum">{formatINR(total, { compact: true })}</p>
        </div>
      </div>

      <div className="w-full space-y-2.5">
        {data.map((d) => {
          const pct = ((d.total / total) * 100).toFixed(1);
          return (
            <div key={d.mode} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[d.mode] || "#c4b5fd" }} />
              <span className="flex-1 text-sm font-medium text-ink-soft">{LABELS[d.mode] || d.mode}</span>
              <span className="text-sm font-semibold text-ink tnum">{formatINR(d.total, { compact: true })}</span>
              <span className="w-12 text-right text-xs font-medium text-ink-muted tnum">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
