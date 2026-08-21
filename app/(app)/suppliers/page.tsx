import { query } from "@/lib/d1";
import { getSession } from "@/lib/auth";
import SuppliersClient from "./SuppliersClient";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const [suppliers, user] = await Promise.all([
    query<{ id: string; name: string; phone: string | null; email: string | null; address: string | null }>(
      `SELECT id, name, phone, email, address FROM Supplier ORDER BY name ASC`,
    ),
    getSession(),
  ]);
  return <SuppliersClient suppliers={suppliers} isAdmin={user?.role === "ADMIN"} />;
}
