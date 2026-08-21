import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import SuppliersClient from "./SuppliersClient";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const [suppliers, user] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    getSession(),
  ]);
  return <SuppliersClient suppliers={suppliers} isAdmin={user?.role === "ADMIN"} />;
}
