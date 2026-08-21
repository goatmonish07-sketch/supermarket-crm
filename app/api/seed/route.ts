import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";

export const runtime = "edge";

function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

/**
 * One-time D1 seeder. Call:  /api/seed?token=YOUR_SEED_TOKEN
 * The token must match the SEED_TOKEN (or AUTH_SECRET) env var set in Cloudflare.
 * Safe to re-run: it wipes and re-seeds.
 */
export async function GET(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = getRequestContext().env as any;
  const expected = env.SEED_TOKEN || env.AUTH_SECRET;
  const token = new URL(req.url).searchParams.get("token");
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 401 });
  }

  const prisma = getDb();

  // Wipe (FK-safe order)
  await prisma.stockMovement.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  await prisma.setting.create({
    data: {
      id: 1, shopName: "SuperMart", tagline: "Fresh Groceries & Daily Essentials",
      address: "Gandhipuram, Coimbatore, TN 641012", phone: "+91 98765 43210",
      gstin: "33ABCDE1234F1Z5", currency: "INR", loyaltyRate: 100,
    },
  });

  const adminHash = await bcrypt.hash("admin123", 10);
  const cashierHash = await bcrypt.hash("cashier123", 10);
  const admin = await prisma.user.create({ data: { name: "Admin User", email: "admin@shop.com", passwordHash: adminHash, role: "ADMIN" } });
  const cashier = await prisma.user.create({ data: { name: "Ravi Cashier", email: "cashier@shop.com", passwordHash: cashierHash, role: "CASHIER" } });

  const catDefs: [string, string][] = [
    ["Grocery & Staples", "#7c5cfc"], ["Beverages", "#f59e0b"], ["Personal Care", "#ec4899"],
    ["Household", "#10b981"], ["Dairy & Bakery", "#3b82f6"], ["Snacks & Packaged", "#f43f5e"],
  ];
  const categories: Record<string, string> = {};
  for (const [name, color] of catDefs) {
    const c = await prisma.category.create({ data: { name, color } });
    categories[name] = c.id;
  }

  const productDefs: [string, string, string, number, number, number, number, number, string][] = [
    ["India Gate Basmati Rice 5kg", "GRC-1001", "Grocery & Staples", 480, 560, 5, 60, 15, "bag"],
    ["Aashirvaad Atta 5kg", "GRC-1002", "Grocery & Staples", 230, 275, 5, 12, 30, "bag"],
    ["Tata Salt 1kg", "GRC-1003", "Grocery & Staples", 20, 28, 5, 8, 25, "pcs"],
    ["Fortune Sunflower Oil 1L", "GRC-1004", "Grocery & Staples", 130, 155, 5, 5, 20, "bottle"],
    ["Toor Dal 1kg", "GRC-1005", "Grocery & Staples", 120, 145, 0, 40, 15, "pcs"],
    ["Sugar 1kg", "GRC-1006", "Grocery & Staples", 40, 48, 5, 55, 20, "pcs"],
    ["Saffola Sunflower Oil 1L", "GRC-1007", "Grocery & Staples", 150, 178, 5, 5, 20, "bottle"],
    ["Coca-Cola 2.25L", "BEV-2001", "Beverages", 85, 110, 28, 48, 12, "bottle"],
    ["Tata Tea Premium 1kg", "BEV-2002", "Beverages", 340, 410, 5, 22, 10, "pcs"],
    ["Bru Instant Coffee 200g", "BEV-2003", "Beverages", 260, 315, 18, 18, 8, "pcs"],
    ["Real Fruit Juice 1L", "BEV-2004", "Beverages", 90, 120, 12, 30, 10, "pcs"],
    ["Bisleri Water 1L", "BEV-2005", "Beverages", 12, 20, 18, 120, 24, "bottle"],
    ["Colgate Strong Teeth 200g", "PC-3001", "Personal Care", 78, 99, 18, 6, 20, "pcs"],
    ["Dove Soap 100g", "PC-3002", "Personal Care", 40, 55, 18, 65, 20, "pcs"],
    ["Head & Shoulders Shampoo 340ml", "PC-3003", "Personal Care", 210, 265, 18, 24, 10, "pcs"],
    ["Gillette Razor", "PC-3004", "Personal Care", 45, 65, 18, 40, 15, "pcs"],
    ["Surf Excel Matic 1kg", "HH-4001", "Household", 110, 135, 18, 7, 20, "pcs"],
    ["Vim Dishwash Bar", "HH-4002", "Household", 10, 15, 18, 90, 30, "pcs"],
    ["Harpic Toilet Cleaner 1L", "HH-4003", "Household", 95, 122, 18, 28, 12, "pcs"],
    ["Good Knight Refill", "HH-4004", "Household", 55, 72, 18, 35, 15, "pcs"],
    ["Amul Toned Milk 1L", "DB-5001", "Dairy & Bakery", 54, 66, 0, 80, 20, "pcs"],
    ["Amul Butter 500g", "DB-5002", "Dairy & Bakery", 245, 275, 12, 20, 10, "pcs"],
    ["Britannia Bread 400g", "DB-5003", "Dairy & Bakery", 35, 45, 5, 34, 15, "pcs"],
    ["Nestle Curd 400g", "DB-5004", "Dairy & Bakery", 30, 40, 5, 26, 12, "pcs"],
    ["Lay's Chips 90g", "SN-6001", "Snacks & Packaged", 20, 30, 12, 150, 30, "pcs"],
    ["Parle-G Biscuit 800g", "SN-6002", "Snacks & Packaged", 70, 90, 18, 60, 20, "pcs"],
    ["Maggi Noodles 12-pack", "SN-6003", "Snacks & Packaged", 120, 156, 12, 44, 15, "pcs"],
    ["Haldiram Bhujia 400g", "SN-6004", "Snacks & Packaged", 90, 118, 12, 9, 15, "pcs"],
  ];
  const products = [];
  for (const [name, sku, cat, cost, sell, gst, stock, low, unit] of productDefs) {
    const p = await prisma.product.create({
      data: { name, sku, categoryId: categories[cat], costPrice: cost, sellPrice: sell, taxRate: gst, stock, lowStockThreshold: low, unit },
    });
    products.push(p);
  }

  await prisma.supplier.create({ data: { name: "Metro Cash & Carry", phone: "+91 90000 11111", email: "sales@metro.in", address: "Peelamedu, Coimbatore" } });
  await prisma.supplier.create({ data: { name: "Reliance Distributors", phone: "+91 90000 22222", email: "orders@ril.in", address: "Avinashi Rd, Coimbatore" } });
  await prisma.supplier.create({ data: { name: "Local Farm Fresh", phone: "+91 90000 33333", address: "Mettupalayam" } });

  const customerDefs: [string, string, string | null, string, number, number][] = [
    ["Rajesh Kumar", "+91 98111 22334", "rajesh@example.com", "RS Puram", 340, 0],
    ["Priya Sharma", "+91 98222 33445", "priya@example.com", "Saibaba Colony", 180, 0],
    ["Arun Kumar", "+91 98333 44556", null, "Gandhipuram", 95, 1780],
    ["Meena Devi", "+91 98444 55667", null, "Ganapathy", 60, 0],
    ["Suresh Babu", "+91 98555 66778", "suresh@example.com", "Peelamedu", 220, 980],
    ["Lakshmi N", "+91 98666 77889", null, "Singanallur", 45, 0],
    ["Karthik R", "+91 98777 88990", "karthik@example.com", "Vadavalli", 300, 2450],
    ["Deepa M", "+91 98888 99001", null, "Race Course", 130, 0],
  ];
  const customers = [];
  for (const [name, phone, email, address, pts, due] of customerDefs) {
    const c = await prisma.customer.create({ data: { name, phone, email: email ?? undefined, address, loyaltyPoints: pts, dueBalance: due } });
    customers.push(c);
  }

  // Historical invoices (last 10 days, a few per day) — kept modest for Worker limits.
  const modes = ["UPI", "CASH", "CARD", "UPI", "CASH", "CREDIT"];
  let counter = 1;
  const now = new Date();
  for (let day = 9; day >= 0; day--) {
    const perDay = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < perDay; k++) {
      const created = new Date(now);
      created.setDate(now.getDate() - day);
      created.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60), 0, 0);
      const chosen = [...products].sort(() => 0.5 - Math.random()).slice(0, 2 + Math.floor(Math.random() * 3));
      let subtotal = 0, taxTotal = 0;
      const items = chosen.map((p) => {
        const qty = 1 + Math.floor(Math.random() * 3);
        const base = qty * p.sellPrice;
        subtotal += base; taxTotal += (base * p.taxRate) / 100;
        return { productId: p.id, name: p.name, qty, unitPrice: p.sellPrice, taxRate: p.taxRate, lineTotal: base };
      });
      subtotal = Math.round(subtotal * 100) / 100;
      taxTotal = Math.round(taxTotal * 100) / 100;
      const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;
      const mode = modes[Math.floor(Math.random() * modes.length)];
      const customer = Math.random() > 0.35 ? customers[Math.floor(Math.random() * customers.length)] : null;
      const isCredit = mode === "CREDIT" && customer;
      const paidAmount = isCredit ? Math.round(grandTotal * 0.5 * 100) / 100 : grandTotal;
      const dueAmount = Math.round((grandTotal - paidAmount) * 100) / 100;
      const dateKey = `${created.getFullYear()}${pad(created.getMonth() + 1, 2)}${pad(created.getDate(), 2)}`;
      await prisma.invoice.create({
        data: {
          invoiceNo: `INV-${dateKey}-${pad(counter++, 4)}`,
          customerId: customer?.id, userId: Math.random() > 0.5 ? admin.id : cashier.id,
          subtotal, taxTotal, discount: 0, grandTotal, paymentMode: mode, paidAmount, dueAmount,
          status: dueAmount > 0 ? "PARTIAL" : "PAID", createdAt: created,
          items: { create: items },
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    seeded: { products: products.length, customers: customers.length, invoices: counter - 1 },
    logins: { admin: "admin@shop.com / admin123", cashier: "cashier@shop.com / cashier123" },
  });
}
