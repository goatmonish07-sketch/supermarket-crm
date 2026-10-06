import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, Scissors, Shirt } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { localDate, startOfLocalDay } from "@/lib/dates";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";

export const metadata = { title: "Calendar" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; day?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const manage = can(user.role, "orders.manage");
  if (!manage && !can(user.role, "jobs.update")) redirect("/dashboard?denied=1");
  const tz = user.store?.timezone ?? "Asia/Kolkata";
  const today = localDate(new Date(), tz);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const start = startOfLocalDay(`${month}-01`, tz);
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const end = startOfLocalDay(`${nextMonth}-01`, tz);
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") && sp.day!.startsWith(month) ? sp.day! : today.startsWith(month) ? today : `${month}-01`;

  const orders = await db.order.findMany({
    where: {
      tenantId: user.tenantId,
      status: { notIn: ["CANCELLED"] },
      ...(manage ? {} : { assigneeId: user.id, kind: "JOB" as const }),
      OR: [{ dueDate: { gte: start, lt: end } }, { trialDate: { gte: start, lt: end } }],
    },
    include: { customer: { select: { name: true } }, assignee: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });

  type Entry = { id: string; number: string; kind: string; status: (typeof orders)[number]["status"]; customer: string; assignee: string | null; type: "due" | "trial"; open: boolean };
  const byDay = new Map<string, Entry[]>();
  for (const o of orders) {
    const base = { id: o.id, number: o.number, kind: o.kind, status: o.status, customer: o.customer.name, assignee: o.assignee?.name ?? null, open: o.status !== "DELIVERED" };
    if (o.dueDate && o.dueDate >= start && o.dueDate < end) {
      const d = localDate(o.dueDate, tz);
      byDay.set(d, [...(byDay.get(d) ?? []), { ...base, type: "due" }]);
    }
    if (o.trialDate && o.trialDate >= start && o.trialDate < end) {
      const d = localDate(o.trialDate, tz);
      byDay.set(d, [...(byDay.get(d) ?? []), { ...base, type: "trial" }]);
    }
  }
  const dayList = byDay.get(selected) ?? [];
  const monthName = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const pretty = new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-4">
      <PageHeader title="Calendar" subtitle="Due dates and trial fittings" back={{ href: "/orders", label: "Orders & Jobs" }} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <section className="card min-w-0 p-3 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <Link href={`?month=${prevMonth}`} className="btn-ghost h-11 w-11 p-0" aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h2 className="text-xl font-semibold">{monthName}</h2>
            <Link href={`?month=${nextMonth}`} className="btn-ghost h-11 w-11 p-0" aria-label="Next month">
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-semibold text-muted sm:gap-1" aria-hidden="true">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const entries = byDay.get(date) ?? [];
              const due = entries.filter((e) => e.type === "due" && e.open).length;
              const trials = entries.filter((e) => e.type === "trial" && e.open).length;
              const late = date < today && due > 0;
              const label = `${i + 1} ${monthName}: ${due} due, ${trials} trial${trials === 1 ? "" : "s"}${late ? ", overdue" : ""}`;
              return (
                <Link
                  key={date}
                  href={`?month=${month}&day=${date}`}
                  aria-label={label}
                  aria-current={date === selected ? "date" : undefined}
                  className={cn(
                    "flex min-h-[52px] min-w-0 flex-col items-center justify-start gap-0.5 overflow-hidden rounded-xl border p-0.5 text-sm transition sm:min-h-[84px] sm:items-start sm:gap-1 sm:p-2",
                    date === selected ? "border-primary bg-primary-soft" : "border-transparent hover:bg-surface-2",
                    date === today && date !== selected && "border-border",
                  )}
                >
                  <span className={cn("tabular font-semibold", date === today && "text-primary")}>{i + 1}</span>
                  {due > 0 && (
                    <span className={cn("tabular inline-flex items-center rounded-md px-1 text-[11px] font-semibold sm:px-1.5", late ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary")}>
                      {late && <AlertTriangle className="mr-0.5 inline h-3 w-3" aria-hidden="true" />}
                      {due}
                      <span className="hidden sm:inline"> due</span>
                    </span>
                  )}
                  {trials > 0 && (
                    <span className="tabular rounded-md bg-warning/10 px-1 text-[11px] font-semibold text-warning sm:px-1.5">
                      {trials}
                      <span className="hidden sm:inline"> trial</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card h-fit">
          <h2 className="text-xl font-semibold">{pretty}</h2>
          {dayList.length === 0 ? (
            <p className="mt-4 text-muted">Nothing due.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {dayList.map((e) => (
                <li key={e.id + e.type}>
                  <Link href={`/orders/${e.id}`} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3 hover:bg-surface-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted" aria-hidden="true">
                      {e.kind === "JOB" ? <Scissors className="h-4 w-4" /> : <Shirt className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        <span className="font-mono text-sm">{e.number}</span> · {e.customer}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {e.type === "trial" ? "Trial fitting" : "Due"}
                        {e.assignee && ` · ${e.assignee}`}
                      </span>
                    </span>
                    <StatusPill tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</StatusPill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
