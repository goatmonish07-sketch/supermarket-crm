"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrintControls() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (params.get("print") === "1") {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [params]);

  return (
    <div className="no-print mb-4 flex items-center justify-between">
      <Link href="/invoices" className="btn-ghost btn-sm">
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </Link>
      <button onClick={() => window.print()} className="btn-primary btn-sm">
        <Printer className="h-4 w-4" /> Print / Save PDF
      </button>
    </div>
  );
}
