import { query } from "@/lib/d1";
import { getSession } from "@/lib/auth";
import StaffClient from "./StaffClient";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const [users, me] = await Promise.all([
    query<{ id: string; name: string; email: string; role: string; active: number; createdAt: string; invoiceCount: number }>(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.createdAt,
              (SELECT COUNT(*) FROM Invoice i WHERE i.userId = u.id) AS invoiceCount
       FROM User u ORDER BY u.createdAt ASC`,
    ),
    getSession(),
  ]);

  return (
    <StaffClient
      users={users.map((u) => ({
        id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active,
        createdAt: u.createdAt, invoiceCount: u.invoiceCount,
      }))}
      currentUserId={me?.id ?? ""}
    />
  );
}
