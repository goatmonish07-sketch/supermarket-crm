"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { cn } from "@/lib/utils";

/** EAN-13 for 13-digit codes, CODE128 for anything else (SKUs, order numbers). */
export function Barcode({ value, className, height = 34 }: { value: string; className?: string; height?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const base = { displayValue: true, fontSize: 11, height, margin: 0, background: "transparent", font: "monospace" };
    try {
      JsBarcode(ref.current, value, { ...base, format: /^\d{13}$/.test(value) ? "EAN13" : "CODE128", width: 1.3 });
    } catch {
      JsBarcode(ref.current, value, { ...base, format: "CODE128", width: 1.2 });
    }
  }, [value, height]);
  return <svg ref={ref} className={cn("h-auto w-full", className)} role="img" aria-label={`Barcode ${value}`} />;
}
