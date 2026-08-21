"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { compactNumber, formatINR } from "@/lib/format";

type Point = { label: string; total: number };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-ink px-3 py-2 text-white shadow-pop">
      <p className="text-[11px] font-medium text-violet-200">{label}</p>
      <p className="text-sm font-bold tnum">{formatINR(payload[0].value)}</p>
    </div>
  );
}

export default function RevenueTrendChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" vertical={false} />
        <XAxis
          dataKey="label" tickLine={false} axisLine={false}
          tick={{ fill: "#8b87a3", fontSize: 11 }} interval="preserveStartEnd" minTickGap={16}
        />
        <YAxis
          tickLine={false} axisLine={false} width={52}
          tick={{ fill: "#8b87a3", fontSize: 11 }}
          tickFormatter={(v) => "₹" + compactNumber(v)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#c4b5fd", strokeWidth: 1 }} />
        <Area
          type="monotone" dataKey="total" stroke="#7c5cfc" strokeWidth={2.5}
          fill="url(#revFill)" activeDot={{ r: 5, fill: "#7c5cfc", stroke: "#fff", strokeWidth: 2 }}
          dot={{ r: 3, fill: "#7c5cfc", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
