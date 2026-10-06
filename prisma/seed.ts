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
  // Sample catalogue so the demo has stock in every status.
  const owner = await db.user.findFirstOrThrow({ where: { tenantId: tenant.id, role: "OWNER" } });
  const cat = async (name: string) => (await db.category.create({ data: { tenantId: tenant.id, name } })).id;
  const kurtis = await cat("Kurtis");
  const sarees = await cat("Sarees");
  const tailoring = await cat("Tailoring");
  let seq = 0;
  const ean = () => {
    const body = "20" + String(++seq).padStart(10, "0");
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
    return body + String((10 - (sum % 10)) % 10);
  };
  const products: { name: string; categoryId: string; type?: "GOODS" | "SERVICE"; taxCode: string; price: number; mrp: number; cost?: number; variants: [string | null, string | null, number][] }[] = [
    { name: "Anarkali Kurti", categoryId: kurtis, taxCode: "6204", price: 149900, mrp: 199900, cost: 72000, variants: [["M", "Maroon", 6], ["L", "Maroon", 2], ["XL", "Maroon", 0], ["M", "Teal", 5]] },
    { name: "Cotton Straight Kurti", categoryId: kurtis, taxCode: "6204", price: 89900, mrp: 89900, cost: 41000, variants: [["S", "Mustard", 8], ["M", "Mustard", 9], ["L", "Mustard", 7]] },
    { name: "Banarasi Silk Saree", categoryId: sarees, taxCode: "5007", price: 849900, mrp: 999900, cost: 520000, variants: [["Free size", "Red", 1], ["Free size", "Gold", 3]] },
    { name: "Blouse Stitching", categoryId: tailoring, type: "SERVICE", taxCode: "998821", price: 65000, mrp: 65000, variants: [[null, null, 0]] },
  ];
  for (const p of products) {
    const type = p.type ?? "GOODS";
    const item = await db.item.create({ data: { tenantId: tenant.id, name: p.name, categoryId: p.categoryId, type, taxCode: p.taxCode, gstRateBp: 500 } });
    for (const [index, [size, colour, qty]] of p.variants.entries()) {
      const sku = [p.name.split(" ").map((w) => w.slice(0, 3).toUpperCase()).join(""), size?.replace(/\W/g, "").toUpperCase(), colour?.slice(0, 3).toUpperCase()].filter(Boolean).join("-");
      const v = await db.variant.create({
        data: { tenantId: tenant.id, itemId: item.id, size, colour, sku, barcode: ean(), price: p.price, mrp: p.mrp, cost: p.cost, onHand: qty, sortOrder: index, reorderLevel: type === "GOODS" ? 2 : 0 },
      });
      if (qty > 0) await db.stockMovement.create({ data: { tenantId: tenant.id, variantId: v.id, userId: owner.id, type: "OPENING", qty, balanceAfter: qty, reason: "Opening stock" } });
    }
  }
  await db.tenant.update({ where: { id: tenant.id }, data: { barcodeSeq: seq } });

  console.log("Seeded demo shop: demo-boutique");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
