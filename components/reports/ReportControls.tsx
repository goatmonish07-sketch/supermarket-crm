"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, CalendarRange } from "lucide-react";

const PRESETS: { label: string; days: number }[] = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

export default function ReportControls({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply(nf: string, nt: string) {
    router.push(`/reports?from=${nf}&to=${nt}`);
  }

  function preset(days: number) {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 86400000);
    apply(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => preset(p.days)} className="btn-soft btn-sm">{p.label}</button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-surface px-3 py-1.5">
        <CalendarRange className="h-4 w-4 text-ink-muted" />
        <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="bg-transparent text-sm text-ink outline-none" />
        <span className="text-ink-muted">→</span>
        <input type="date" value={t} onChange={(e) => setT(e.target.value)} className="bg-transparent text-sm text-ink outline-none" />
        <button onClick={() => apply(f, t)} className="btn-primary btn-sm">Apply</button>
      </div>
      <a href={`/api/reports/export?from=${from}&to=${to}`} className="btn-outline btn-sm">
        <Download className="h-4 w-4" /> Export CSV
      </a>
    </div>
  );
}
