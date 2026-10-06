"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
        {now ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "--:--:--"}
      </p>
      <p className="mt-2 text-sm text-white/70">
        {now ? now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : " "}
      </p>
    </div>
  );
}
