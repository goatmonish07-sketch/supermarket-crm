"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Ban, Check, IndianRupee, Loader2, MessageCircle, PackageCheck, PauseCircle, PencilLine, PlayCircle, Printer, ReceiptText } from "lucide-react";
import type { OrderKind, OrderStatus, PaymentMethod } from "@prisma/client";
import { STATUS_LABEL, manualStages, nextStage } from "@/lib/orders";
import { cn, formatMoney } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { addPaymentAction, cancelOrderAction, reserveStockAction, setStatusAction, toggleHoldAction, updateDetailsAction } from "../actions";

type Props = {
  id: string;
  number: string;
  kind: OrderKind;
  status: OrderStatus;
  onHold: boolean;
  open: boolean;
  balance: number;
  advance: number;
  canManage: boolean;
  canWork: boolean;
  canBill: boolean;
  canCancel: boolean;
  shortStock: boolean;
  whatsappHref: string;
  details: { dueDate: string; trialDate: string; assigneeId: string; notes: string };
  staff: { id: string; name: string }[];
};

export function StageStepper({ kind, status, onChange, disabled }: { kind: OrderKind; status: OrderStatus; onChange?: (s: OrderStatus) => void; disabled?: boolean }) {
  const flow = [...manualStages(kind), "DELIVERED" as OrderStatus];
  const current = flow.indexOf(status);
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Stages">
      {flow.map((s, i) => {
        const done = status !== "CANCELLED" && i < current;
        const now = s === status;
        const clickable = onChange && !disabled && s !== "DELIVERED" && !now;
        return (
          <li key={s}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onChange(s)}
              aria-current={now ? "step" : undefined}
              className={cn(
                "flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition",
                now ? "border-primary bg-primary text-primary-fg" : done ? "border-primary/40 bg-primary-soft text-fg" : "border-border text-muted",
                clickable && "hover:border-primary",
                !clickable && "cursor-default",
              )}
            >
              {done && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {STATUS_LABEL[s]}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderActions(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState<"pay" | "cancel" | "edit" | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reason, setReason] = useState("");
  const [keepAdvance, setKeepAdvance] = useState(false);
  const [details, setDetails] = useState(p.details);
  const next = nextStage(p.kind, p.status);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, close = true) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (r.ok) {
        setMessage(r.message ?? "");
        if (close) setSheet(null);
        router.refresh();
      } else setError(r.error ?? "Something went wrong");
    });

  return (
    <div className="space-y-4 print:hidden">
      <StageStepper kind={p.kind} status={p.status} disabled={!p.open || !p.canWork || p.onHold} onChange={(s) => run(() => setStatusAction(p.id, s))} />

      {(message || (error && !sheet)) && (
        <p role={error ? "alert" : "status"} className={cn("rounded-2xl px-4 py-3 text-sm", error ? "border border-danger/30 bg-danger/5 text-danger" : "bg-primary-soft")}>
          {error || message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {p.open && p.canBill && (p.status === "READY" || p.status === "OUT_FOR_DELIVERY") && (
          <Link href={`/billing?order=${p.id}`} className="btn-primary h-12">
            <ReceiptText className="h-4 w-4" aria-hidden="true" /> Create bill · {formatMoney(p.balance)} due
          </Link>
        )}
        {p.open && p.canWork && next && !p.onHold && (
          <button type="button" className={p.status === "READY" ? "btn-outline h-12" : "btn-primary h-12"} disabled={pending} onClick={() => run(() => setStatusAction(p.id, next))}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            Move to {STATUS_LABEL[next]}
          </button>
        )}
        {p.open && p.canBill && p.status !== "READY" && p.status !== "OUT_FOR_DELIVERY" && (
          <Link href={`/billing?order=${p.id}`} className="btn-ghost h-12">
            <ReceiptText className="h-4 w-4" aria-hidden="true" /> Bill now
          </Link>
        )}
        {p.open && p.shortStock && p.canManage && (
          <button type="button" className="btn-outline h-12" disabled={pending} onClick={() => run(() => reserveStockAction(p.id), false)}>
            <PackageCheck className="h-4 w-4" aria-hidden="true" /> Reserve stock
          </button>
        )}
        <a href={p.whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-outline h-12">
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp update
        </a>
        <Link href={`/orders/${p.id}/slip`} className="btn-ghost h-12">
          <Printer className="h-4 w-4" aria-hidden="true" /> Slip
        </Link>
        {p.open && p.canManage && (
          <>
            <button type="button" className="btn-ghost h-12" onClick={() => setSheet("pay")} disabled={p.balance <= 0}>
              <IndianRupee className="h-4 w-4" aria-hidden="true" /> Add advance
            </button>
            <button type="button" className="btn-ghost h-12" onClick={() => setSheet("edit")}>
              <PencilLine className="h-4 w-4" aria-hidden="true" /> Edit
            </button>
          </>
        )}
        {p.open && p.canWork && (
          <button type="button" className="btn-ghost h-12" disabled={pending} onClick={() => run(() => toggleHoldAction(p.id), false)}>
            {p.onHold ? <PlayCircle className="h-4 w-4" aria-hidden="true" /> : <PauseCircle className="h-4 w-4" aria-hidden="true" />}
            {p.onHold ? "Resume" : "Hold"}
          </button>
        )}
        {p.open && p.canCancel && (
          <button type="button" className="btn-danger h-12" onClick={() => setSheet("cancel")}>
            <Ban className="h-4 w-4" aria-hidden="true" /> Cancel
          </button>
        )}
      </div>

      <Sheet open={sheet === "pay"} onClose={() => setSheet(null)} title="Add advance" description={`Balance ${formatMoney(p.balance)}`} size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {(["CASH", "UPI", "CARD", "BANK"] as PaymentMethod[]).map((m) => (
              <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)} className={cn("h-12 rounded-2xl border-2 text-sm font-medium", method === m ? "border-primary bg-primary-soft" : "border-border")}>
                {m === "BANK" ? "Bank" : m[0] + m.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="label">Amount (₹)</span>
            <input className="input tabular text-lg" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            className="btn-primary h-12 w-full"
            disabled={pending || !Number(amount)}
            onClick={() => run(() => addPaymentAction({ orderId: p.id, method, amount: Math.round(Number(amount) * 100) }))}
          >
            Save payment
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title="Edit details" size="sm">
        <div className="space-y-4">
          <label className="block">
            <span className="label">Due date</span>
            <input type="date" className="input" value={details.dueDate} onChange={(e) => setDetails((d) => ({ ...d, dueDate: e.target.value }))} />
          </label>
          {p.kind === "JOB" && (
            <label className="block">
              <span className="label">Trial date</span>
              <input type="date" className="input" value={details.trialDate} onChange={(e) => setDetails((d) => ({ ...d, trialDate: e.target.value }))} />
            </label>
          )}
          <label className="block">
            <span className="label">Assigned to</span>
            <select className="input" value={details.assigneeId} onChange={(e) => setDetails((d) => ({ ...d, assigneeId: e.target.value }))}>
              <option value="">Not assigned</option>
              {p.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Notes</span>
            <textarea className="input h-auto py-3" rows={3} value={details.notes} onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))} />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button type="button" className="btn-primary h-12 w-full" disabled={pending} onClick={() => run(() => updateDetailsAction({ orderId: p.id, ...details }))}>
            Save
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "cancel"} onClose={() => setSheet(null)} title={`Cancel ${p.number}?`} description="Held stock goes back to available." size="sm">
        <div className="space-y-4">
          <label className="block">
            <span className="label">
              Reason <span className="text-danger">*</span>
            </span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {p.advance > 0 && (
            <fieldset className="space-y-2">
              <legend className="label">Advance of {formatMoney(p.advance)}</legend>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="radio" name="adv" checked={!keepAdvance} onChange={() => setKeepAdvance(false)} className="h-5 w-5 accent-[rgb(var(--primary))]" />
                Refund to customer (cash)
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="radio" name="adv" checked={keepAdvance} onChange={() => setKeepAdvance(true)} className="h-5 w-5 accent-[rgb(var(--primary))]" />
                Keep advance (no refund)
              </label>
            </fieldset>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost h-12 flex-1" onClick={() => setSheet(null)}>
              Keep order
            </button>
            <button
              type="button"
              className="btn-danger h-12 flex-1"
              disabled={pending || reason.trim().length < 3}
              onClick={() => run(() => cancelOrderAction({ orderId: p.id, reason, refundMethod: "CASH", keepAdvance }))}
            >
              Cancel order
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
