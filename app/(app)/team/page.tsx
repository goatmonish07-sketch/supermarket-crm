import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { assignableRoles, ROLE_LABELS } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { AddStaffForm } from "./add-staff-form";
import { toggleStaffAction } from "./actions";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const user = await requirePermission("team.manage");
  const staff = await db.user.findMany({ where: { tenantId: user.tenantId }, orderBy: [{ active: "desc" }, { createdAt: "asc" }] });
  const roles = assignableRoles(user.role).map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
      <section className="card">
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="mt-1 text-muted">
          {staff.filter((s) => s.active).length} active of {staff.length} staff
        </p>
        <ul className="mt-6 divide-y divide-border/70">
          {staff.map((s) => {
            const locked = s.id === user.id || (s.role === "OWNER" && user.role !== "OWNER");
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-4">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {s.name} {s.id === user.id && <span className="font-normal text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{[ROLE_LABELS[s.role], s.phone, s.email].filter(Boolean).join(" · ")}</p>
                </div>
                <StatusPill tone={s.active ? "success" : "neutral"}>{s.active ? "Active" : "Inactive"}</StatusPill>
                {!locked && (
                  <form action={toggleStaffAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn-ghost h-11 px-4 text-sm">{s.active ? "Deactivate" : "Activate"}</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="card h-fit">
        <h2 className="text-xl font-semibold">Add staff</h2>
        <p className="mb-5 mt-1 text-sm text-muted">Cashiers usually only need a PIN.</p>
        <AddStaffForm roles={roles} />
      </section>
    </div>
  );
}
