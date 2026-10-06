"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/** URL-driven filters: deep-linkable and back-button safe. */
export function FilterBar({
  types,
  statuses,
  categories,
  searchPlaceholder,
}: {
  types?: Option[];
  statuses: Option[];
  categories: string[];
  searchPlaceholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const push = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // Debounced search.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => push({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const chip = (key: string, opt: Option | null) => {
    const value = opt?.value ?? null;
    const active = (params.get(key) ?? null) === value;
    return (
      <button
        key={key + (value ?? "all")}
        type="button"
        aria-pressed={active}
        onClick={() => push({ [key]: value })}
        className={cn(
          "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition duration-150",
          active ? "border-fg bg-fg text-bg" : "border-border text-muted hover:border-fg/40 hover:text-fg",
        )}
      >
        {opt?.label ?? "All"}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input type="search" className="input pl-12" placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          {pending && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" aria-label="Loading" />}
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Category</span>
          <select className="input" value={params.get("category") ?? ""} onChange={(e) => push({ category: e.target.value || null })}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Filters">
        {types && (
          <>
            {chip("type", null)}
            {types.map((t) => chip("type", t))}
            <span className="mx-1 hidden w-px self-stretch bg-border sm:block" aria-hidden="true" />
          </>
        )}
        {statuses.map((s) => chip("status", s))}
      </div>
    </div>
  );
}
