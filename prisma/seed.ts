// Demo shop for local development and the public demo.
// Log in with Shop ID "demo-boutique", email owner@demo.aurapos.in, password demo1234 (PIN 1234).
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  await db.tenant.deleteMany({ where: { slug: "demo-boutique" } });
  const [password, pin] = await Promise.all([bcrypt.hash("demo1234", 10), bcrypt.hash("1234", 10)]);

  const tenant = await db.tenant.create({
    data: { name: "Demo Boutique", slug: "demo-boutique", trialEndsAt: new Date(Date.now() + 14 * 86_400_000) },
  });
  const store = await db.store.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Boutique",
      phone: "98765 43210",
      address: "12 MG Road",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600001",
      upiId: "demoboutique@okbank",
      invoicePrefix: "DB",
    },
  });

  const staff: { name: string; role: Role; email?: string }[] = [
    { name: "Anita Sharma", role: "OWNER", email: "owner@demo.aurapos.in" },
    { name: "Rahul Verma", role: "MANAGER", email: "manager@demo.aurapos.in" },
    { name: "Kavya Nair", role: "CASHIER" },
    { name: "Imran Khan", role: "STOCK" },
    { name: "Lakshmi Devi", role: "TAILOR" },
  ];
  for (const s of staff) {
    await db.user.create({
      data: { tenantId: tenant.id, storeId: store.id, name: s.name, role: s.role, email: s.email, passwordHash: s.email ? password : null, pinHash: pin },
    });
  }
  console.log("Seeded demo shop: demo-boutique");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
