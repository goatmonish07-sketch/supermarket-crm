import { prisma } from "@/lib/db";
import CustomersClient from "./CustomersClient";
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <CustomersClient
      customers={customers.map((c) => ({
        id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address,
        loyaltyPoints: c.loyaltyPoints, dueBalance: c.dueBalance, invoiceCount: c._count.invoices,
      }))}
    />
  );
}
