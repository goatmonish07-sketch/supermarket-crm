import { query } from "@/lib/d1";
import CustomersClient from "./CustomersClient";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await query<{
    id: string; name: string; phone: string; email: string | null; address: string | null;
    loyaltyPoints: number; dueBalance: number; invoiceCount: number;
  }>(
    `SELECT c.id, c.name, c.phone, c.email, c.address, c.loyaltyPoints, c.dueBalance,
            (SELECT COUNT(*) FROM Invoice i WHERE i.customerId = c.id) AS invoiceCount
     FROM Customer c ORDER BY c.createdAt DESC`,
  );

  return <CustomersClient customers={customers} />;
}
