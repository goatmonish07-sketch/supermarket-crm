# 🛒 SuperMart CRM

An advanced, full-featured **CRM & billing dashboard for supermarket businesses** — built with
Next.js, Prisma and SQLite. Elegant aesthetic-violet UI, GST-ready billing, inventory,
customer loyalty and live analytics.

![Dashboard](https://img.shields.io/badge/Next.js-14-black) ![Prisma](https://img.shields.io/badge/Prisma-5-5a67d8) ![License](https://img.shields.io/badge/license-MIT-violet)

## ✨ Features

- **Dashboard** — KPI cards (today's sales, 7-day revenue, customers, dues, low stock),
  revenue-trend area chart, payment-mode donut, top products, low-stock alerts, recent
  invoices and quick actions.
- **POS / Billing** — fast product search & category filters, cart with live GST
  (CGST + SGST split), invoice-level discounts, CASH / UPI / CARD / Khata (credit) payment
  modes, printable / PDF invoices. Stock is decremented atomically on each sale.
- **Invoices** — searchable, filterable list; branded printable invoice pages.
- **Inventory** — product & category CRUD, GST slabs (0/5/12/18/28%), stock levels,
  low-stock alerts, restock with audit trail (stock movements), stock valuation.
- **Customers & Loyalty** — profiles, purchase history, loyalty points (auto-earned),
  and **Khata / dues** tracking with payment collection.
- **Suppliers** — supplier contact directory.
- **Reports** — date-range sales analytics, GST collected, sales by category & top
  products, and **CSV export**.
- **Staff management** (admin) — add staff, Admin/Cashier roles, activate/deactivate,
  reset passwords.
- **Settings** (admin) — store profile, GSTIN, and loyalty configuration.
- **Auth & roles** — secure JWT cookie sessions (bcrypt-hashed passwords), route
  protection via middleware, Admin vs Cashier access.

## 🎨 Tech Stack

| Layer     | Choice                                            |
| --------- | ------------------------------------------------- |
| Framework | Next.js 14 (App Router) + TypeScript              |
| Styling   | Tailwind CSS · lucide-react icons · Recharts      |
| Database  | Prisma ORM + SQLite (Postgres-compatible schema)  |
| Auth      | `jose` JWT (httpOnly cookie) + `bcryptjs`         |

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up the database (schema + demo data)
npm run db:push
npm run db:seed

# 3. Run the dev server
npm run dev
```

Open **http://localhost:3000**.

### Demo accounts

| Role    | Email              | Password     |
| ------- | ------------------ | ------------ |
| Admin   | `admin@shop.com`   | `admin123`   |
| Cashier | `cashier@shop.com` | `cashier123` |

> The seed ships 28 products, 8 customers and ~2 weeks of invoices so the dashboard and
> reports look alive on first run.

## 📜 Scripts

| Script            | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Start the dev server                         |
| `npm run build`   | Production build                             |
| `npm run start`   | Run the production build                     |
| `npm run db:push` | Sync the Prisma schema to SQLite             |
| `npm run db:seed` | Seed demo data                               |
| `npm run db:reset`| Reset the database and re-seed               |

## ⚙️ Configuration

`.env` holds two values (a dev default is committed for convenience):

```
DATABASE_URL="file:./dev.db"   # swap for a Postgres URL to scale up
AUTH_SECRET="change-me"        # secret used to sign session cookies
```

## 🗂️ Project Structure

```
app/
  (app)/            # authenticated dashboard shell + all pages
  login/            # login page
  api/              # route handlers (auth, invoices, products, ...)
components/         # layout, UI kit, charts
lib/                # db, auth, billing math, reports, formatting
prisma/             # schema + seed
```

## 💡 Notes

- Barcode "scanning" is a fast SKU text lookup in the POS (no hardware integration).
- PDF export uses the browser's print-to-PDF from the styled invoice page.
- Deleting a product soft-deletes it to preserve invoice history.
