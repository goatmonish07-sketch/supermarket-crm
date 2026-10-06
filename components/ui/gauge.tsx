/** Half-ring progress gauge (0–100). Achieved arc + hatched remainder. */
export function Gauge({ percent, label }: { percent: number; label: string }) {
  const p = Math.max(0, Math.min(100, percent));
  const r = 80;
  const length = Math.PI * r; // half circumference
  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <svg viewBox="0 0 200 116" className="w-full" role="img" aria-label={`${p}% ${label}`}>
        <defs>
          <pattern id="gauge-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="rgb(var(--surface-2))" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgb(var(--muted))" strokeOpacity="0.45" strokeWidth="3" />
          </pattern>
        </defs>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#gauge-hatch)" strokeWidth="26" strokeLinecap="round" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke="rgb(var(--primary))"
          strokeWidth="26"
          strokeLinecap="round"
          strokeDasharray={`${(p / 100) * length} ${length}`}
          className="transition-[stroke-dasharray] duration-700"
          opacity={p === 0 ? 0 : 1}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-5xl font-bold tracking-tight">{p}%</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
