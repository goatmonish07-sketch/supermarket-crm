import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { PinPad } from "./pin-pad";

export const metadata = { title: "Switch user" };

export default async function LockPage() {
  const user = await requireUser();
  const staff = await db.user.findMany({
    where: { tenantId: user.tenantId, active: true, pinHash: { not: null } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Switch user</h1>
      <p className="mb-8 mt-2 text-muted">{user.tenant.name} · enter your PIN</p>
      <PinPad staff={staff.map((s) => ({ ...s, role: ROLE_LABELS[s.role] }))} currentId={user.id} />
      <p className="mt-6 text-center text-sm">
        <Link href="/dashboard" className="text-muted hover:text-fg">
          Back to dashboard
        </Link>
      </p>
    </>
  );
}
