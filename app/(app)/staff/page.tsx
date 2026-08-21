import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import StaffClient from "./StaffClient";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const [users, me] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, _count: { select: { invoices: true } } },
    }),
    getSession(),
  ]);

  return (
    <StaffClient
      users={users.map((u) => ({
        id: u.id, name: u.name, email: u.email, role: u.role, active: u.active,
        createdAt: u.createdAt.toISOString(), invoiceCount: u._count.invoices,
      }))}
      currentUserId={me?.id ?? ""}
    />
  );
}
