"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CalendarClock, Loader2, PauseCircle } from "lucide-react";
import type { OrderKind, OrderStatus } from "@prisma/client";
import { STATUS_LABEL, nextStage } from "@/lib/orders";
import { cn, formatMoney } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { setStatusAction } from "./actions";

export type CardOrder = {
  id: string;
  number: string;
  kind: OrderKind;
  status: OrderStatus;
  onHold: boolean;
  customer: string;
  summary: string;
  due: string | null; // formatted
  overdue: boolean;
  dueToday: boolean;
  assignee: string | null;
  balance: number;
};

export function OrderCard({ o, canMove }: { o: CardOrder; canMove: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = nextStage(o.kind, o.status);

  return (
    <article className={cn("rounded-2xl border bg-surface p-3 shadow-card transition", o.onHold ? "border-warning/50" : "border-border/70")}>
      <Link href={`/orders/${o.id}`} className="block rounded-xl focus-visible:outline-offset-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-sm font-semibold">{o.number}</p>
          {o.assignee && <Avatar name={o.assignee} size="sm" className="h-8 w-8 text-[11px]" />}
        </div>
        <p className="mt-1 truncate font-semibold">{o.customer}</p>
        <p className="line-clamp-2 text-sm text-muted">{o.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {o.due && (
            <span className={cn("inline-flex items-center gap-1", o.overdue ? "font-semibold text-danger" : o.dueToday ? "font-semibold text-warning" : "text-muted")}>
              {o.overdue ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> : <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
              {o.overdue ? "Overdue · " : o.dueToday ? "Today · " : ""}
              {o.due}
            </span>
          )}
          {o.onHold && (
            <span className="inline-flex items-center gap-1 font-semibold text-warning">
              <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" /> On hold
            </span>
          )}
          {o.balance > 0 && <span className="tabular text-muted">Due {formatMoney(o.balance)}</span>}
        </div>
      </Link>
      {canMove && next && !o.onHold && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setStatusAction(o.id, next);
              router.refresh();
            })
          }
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-medium transition hover:bg-primary-soft"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          Next: {STATUS_LABEL[next]}
        </button>
      )}
    </article>
  );
}
