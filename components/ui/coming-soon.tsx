import { Sparkles } from "lucide-react";

export function ComingSoon({ title, phase, items }: { title: string; phase: string; items: string[] }) {
  return (
    <div className="card mx-auto max-w-2xl text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-muted">Arriving in {phase}.</p>
      <ul className="mt-6 grid gap-2 text-left text-sm sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-surface-2 px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
