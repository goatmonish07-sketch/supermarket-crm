"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, MessageCircle, Minus, Plus, Printer, ReceiptText, Undo2 } from "lucide-react";
import type { PaymentMethod, ReceiptPaper } from "@prisma/client";
import { cn, formatMoney } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { cancelSaleAction, returnItemsAction } from "../../actions";
import { ApprovalDialog } from "../../dialogs";
import type { StaffOption } from "../../types";

type ReturnLine = { id: string; name: string; variant: string; qty: number; returnedQty: number; total: number };

const PAPERS: { id: ReceiptPaper; label: string }[] = [
  { id: "THERMAL_58", label: "58 mm" },
  { id: "THERMAL_80", label: "80 mm" },
  { id: "A5", label: "A5" },
  { id: "A4", label: "A4" },
];

export function AutoPrint() {
  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}

export function BillActions({
  saleId,
  number,
  paper,
  whatsappHref,
  lines,
  cancelled,
  refundable,
  approvers,
}: {
  saleId: string;
  number: string;
  paper: ReceiptPaper;
  whatsappHref: string;
  lines: ReturnLine[];
  cancelled: boolean;
  refundable: number;
  approvers: StaffOption[];
}) {
  const router = useRouter();
  const [returnOpen, setReturnOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [approval, setApproval] = useState<{ reason: string; run: (a: { userId: string; pin: string }) => void } | null>(null);
  const [pending, start] = useTransition();

  const returnable = lines.filter((l) => l.qty - l.returnedQty > 0);
  const refundEstimate = Math.min(
    refundable,
    lines.reduce((s, l) => s + Math.round((l.total * (qty[l.id] ?? 0)) / l.qty), 0),
  );

  const doReturn = (a?: { userId: string; pin: string }) =>
    start(async () => {
      setError("");
      const r = await returnItemsAction({ saleId, lines: Object.entries(qty).map(([saleItemId, q]) => ({ saleItemId, qty: q })), method, reason, approval: a });
      if (r.ok) {
        setApproval(null);
        setReturnOpen(false);
        setQty({});
        setMessage(r.message ?? "Saved");
        router.refresh();
      } else if (r.needsApproval) setApproval({ reason: r.error, run: doReturn });
      else {
        setApproval(null);
        setError(r.error);
      }
    });

  const doCancel = (a?: { userId: string; pin: string }) =>
    start(async () => {
      setError("");
      const r = await cancelSaleAction({ saleId, reason, approval: a });
      if (r.ok) {
        setApproval(null);
        setCancelOpen(false);
        setMessage(r.message ?? "Cancelled");
        router.refresh();
      } else if (r.needsApproval) setApproval({ reason: r.error, run: doCancel });
      else {
        setApproval(null);
        setError(r.error);
      }
    });

  return (
    <div className="space-y-4 print:hidden">
      {message && (
        <p role="status" className="rounded-2xl bg-primary-soft px-4 py-3 text-sm">
          {message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Paper size" className="flex rounded-full bg-surface-2 p-1">
          {PAPERS.map((p) => (
            <Link
              key={p.id}
              role="radio"
              aria-checked={paper === p.id}
              href={`?paper=${p.id}`}
              replace
              scroll={false}
              className={cn("flex h-10 items-center rounded-full px-3 text-sm font-medium", paper === p.id ? "bg-surface shadow-card" : "text-muted hover:text-fg")}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <button type="button" className="btn-primary h-12" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" /> Print
        </button>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-outline h-12">
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
        </a>
        {!cancelled && returnable.length > 0 && (
          <button type="button" className="btn-outline h-12" onClick={() => setReturnOpen(true)}>
            <Undo2 className="h-4 w-4" aria-hidden="true" /> Return items
          </button>
        )}
        {!cancelled && (
          <button type="button" className="btn-danger h-12" onClick={() => setCancelOpen(true)}>
            <Ban className="h-4 w-4" aria-hidden="true" /> Cancel bill
          </button>
        )}
        <Link href="/billing" className="btn-ghost h-12 sm:ml-auto">
          <ReceiptText className="h-4 w-4" aria-hidden="true" /> New bill
        </Link>
      </div>

      <Sheet open={returnOpen} onClose={() => setReturnOpen(false)} title="Return items" description={`From ${number}. Stock is added back.`}>
        <ul className="space-y-2">
          {returnable.map((l) => {
            const max = l.qty - l.returnedQty;
            const q = qty[l.id] ?? 0;
            return (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{l.name}</p>
                  <p className="text-sm text-muted">
                    {l.variant && `${l.variant} · `}
                    <span className="tabular">{max}</span> returnable
                  </p>
                </div>
                <button type="button" className="btn-ghost h-11 w-11 border border-border p-0" onClick={() => setQty((s) => ({ ...s, [l.id]: Math.max(0, q - 1) }))} aria-label={`Return fewer ${l.name}`}>
                  <Minus className="h-4 w-4" />
                </button>
                <span className="tabular w-6 text-center font-semibold">{q}</span>
                <button type="button" className="btn-ghost h-11 w-11 border border-border p-0" onClick={() => setQty((s) => ({ ...s, [l.id]: Math.min(max, q + 1) }))} aria-label={`Return more ${l.name}`}>
                  <Plus className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Refund by</span>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Reason</span>
            <input className="input" list="return-reasons" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Size issue, defect…" />
            <datalist id="return-reasons">
              <option value="Size issue" />
              <option value="Colour not liked" />
              <option value="Defect" />
              <option value="Exchange" />
            </datalist>
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="button" className="btn-primary mt-4 h-12 w-full" disabled={pending || refundEstimate < 0 || !Object.values(qty).some((q) => q > 0)} onClick={() => doReturn()}>
          Return · refund about {formatMoney(refundEstimate)}
        </button>
      </Sheet>

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Cancel ${number}?`} description="All items go back to stock and payments are reversed. This can't be undone." size="sm">
        <label className="block">
          <span className="label">
            Reason <span className="text-danger">*</span>
          </span>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wrong bill, customer left…" />
        </label>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-ghost h-12 flex-1" onClick={() => setCancelOpen(false)}>
            Keep bill
          </button>
          <button type="button" className="btn-danger h-12 flex-1" disabled={pending || reason.trim().length < 3} onClick={() => doCancel()}>
            Cancel bill
          </button>
        </div>
      </Sheet>

      <ApprovalDialog open={Boolean(approval)} reason={approval?.reason ?? ""} approvers={approvers} onClose={() => setApproval(null)} onApprove={(a) => approval?.run(a)} />
    </div>
  );
}
