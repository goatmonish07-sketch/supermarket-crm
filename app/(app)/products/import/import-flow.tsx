"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, UploadCloud } from "lucide-react";
import { ITEM_TYPE_LABEL } from "@/lib/catalogue";
import { cn } from "@/lib/utils";
import { FormError, SubmitButton } from "@/app/(auth)/form-bits";
import { commitImportAction, previewImportAction } from "./actions";

const STEPS = ["Upload", "Check", "Done"];

export function ImportFlow() {
  const [previewState, previewAction] = useActionState(previewImportAction, undefined);
  const [commitState, commitAction] = useActionState(commitImportAction, undefined);
  const [fileName, setFileName] = useState("");
  const [reset, setReset] = useState(0);

  const preview = reset === 0 || previewState?.preview ? previewState?.preview : undefined;
  const step = commitState?.created !== undefined ? 2 : preview ? 1 : 0;
  const okGroups = preview?.groups.filter((g) => !g.error) ?? [];
  const badGroups = preview?.groups.filter((g) => g.error) ?? [];

  return (
    <div className="space-y-4">
      <ol className="card flex items-center gap-2 py-4" aria-label="Import steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span
              className={cn(
                "tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                i < step ? "bg-primary text-primary-fg" : i === step ? "border-2 border-primary text-primary" : "border border-border text-muted",
              )}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn("text-sm font-medium", i === step ? "text-fg" : "text-muted")}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="card">
          <form action={previewAction} className="space-y-5">
            <label
              htmlFor="file"
              className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border px-6 py-12 text-center transition hover:border-primary hover:bg-primary-soft/40"
            >
              <UploadCloud className="h-10 w-10 text-primary" aria-hidden="true" />
              <span className="mt-3 font-semibold">{fileName || "Choose your Excel or CSV file"}</span>
              <span className="mt-1 text-sm text-muted">.xlsx or .csv · up to 2,000 rows · 5 MB</span>
              <input
                id="file"
                name="file"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                required
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
            <FormError message={previewState?.error} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/products/import/template" prefetch={false} className="btn-ghost h-11">
                <Download className="h-4 w-4" aria-hidden="true" /> Download template
              </Link>
              <div className="w-full sm:w-56">
                <SubmitButton>Check file</SubmitButton>
              </div>
            </div>
          </form>
          <div className="mt-6 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
            <p className="font-semibold text-fg">How rows become products</p>
            <p className="mt-1">
              Rows with the same <strong>Name</strong> become one product, and each row is one size/colour variant. Required columns: Name and Price.
              Leave SKU and Barcode empty to generate them.
            </p>
          </div>
        </section>
      )}

      {step === 1 && preview && (
        <section className="card space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-primary" aria-hidden="true" />
            <p className="font-semibold">{preview.fileName}</p>
            <p className="tabular text-sm text-muted">
              {preview.rowCount} rows → {preview.groups.length} products
            </p>
          </div>
          {preview.unknownColumns.length > 0 && (
            <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">Ignored columns: {preview.unknownColumns.join(", ")}</p>
          )}
          {badGroups.length > 0 && (
            <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
              <p className="flex items-center gap-2 font-semibold text-danger">
                <AlertCircle className="h-4 w-4" aria-hidden="true" /> {badGroups.length} product{badGroups.length === 1 ? "" : "s"} need fixing (they will be skipped)
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {badGroups.map((g) => (
                  <li key={g.name + g.lines}>
                    <strong>{g.name}</strong> <span className="text-muted">(rows {g.lines})</span> — {g.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="font-semibold">
              <span className="tabular">{okGroups.length}</span> ready to import
            </p>
            <ul className="mt-2 max-h-96 divide-y divide-border/60 overflow-y-auto">
              {okGroups.map((g) => (
                <li key={g.name} className="flex items-center gap-3 py-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                  <span className="text-muted">{ITEM_TYPE_LABEL[g.type as keyof typeof ITEM_TYPE_LABEL] ?? g.type}</span>
                  <span className="tabular w-20 text-right text-muted">{g.variants} var.</span>
                  <span className="tabular w-20 text-right text-muted">{g.stock} pcs</span>
                </li>
              ))}
            </ul>
          </div>
          <form action={commitAction} className="flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-4">
            <input type="hidden" name="payload" value={JSON.stringify(preview.valid)} />
            <FormError message={commitState?.error} />
            <button type="button" className="btn-ghost h-12" onClick={() => setReset((n) => n + 1)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Choose another file
            </button>
            {okGroups.length > 0 && (
              <div className="w-full sm:w-64">
                <SubmitButton>
                  Import {okGroups.length} product{okGroups.length === 1 ? "" : "s"}
                </SubmitButton>
              </div>
            )}
          </form>
        </section>
      )}

      {step === 2 && commitState && (
        <section className="card text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft text-primary">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold" role="status">
            {commitState.created} product{commitState.created === 1 ? "" : "s"} imported
          </h2>
          {commitState.skipped && commitState.skipped.length > 0 && (
            <ul className="mx-auto mt-4 max-w-lg space-y-1 text-left text-sm text-muted">
              {commitState.skipped.map((s) => (
                <li key={s.name}>
                  Skipped <strong className="text-fg">{s.name}</strong> — {s.reason}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/products" className="btn-primary h-12">
              View products
            </Link>
            <Link href="/products/labels" className="btn-outline h-12">
              Print labels
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
