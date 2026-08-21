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
| Database  | Prisma ORM + Cloudflare D1 (SQLite)               |
| Hosting   | Cloudflare Pages (`@cloudflare/next-on-pages`, edge)|
| Auth      | `jose` JWT (httpOnly cookie) + `bcryptjs`         |

## 🚀 Getting Started (local)

The app is wired to **Cloudflare D1**, so local dev uses a local D1 database via
Wrangler's dev platform.

```bash
# 1. Install dependencies
npm install

# 2. Local secrets — create .dev.vars
printf 'AUTH_SECRET = "dev-secret"\nSEED_TOKEN = "seed-me"\n' > .dev.vars

# 3. Create the local D1 tables
npx wrangler d1 execute supermart-crm --local --file=./migrations/0001_init.sql

# 4. Run the dev server
npm run dev
```

Open **http://localhost:3000**, then seed demo data once by visiting
`http://localhost:3000/api/seed?token=seed-me`.

> For a production-accurate local preview on the Cloudflare runtime, use
> `npm run preview` instead of `npm run dev`.

### Demo accounts

| Role    | Email              | Password     |
| ------- | ------------------ | ------------ |
| Admin   | `admin@shop.com`   | `admin123`   |
| Cashier | `cashier@shop.com` | `cashier123` |

> The seed ships 28 products, 8 customers and ~2 weeks of invoices so the dashboard and
> reports look alive on first run.

## 📜 Scripts

| Script                    | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Start the local dev server (local D1)          |
| `npm run pages:build`     | Build for Cloudflare Pages                      |
| `npm run preview`         | Local Cloudflare-runtime preview               |
| `npm run deploy`          | Build and deploy to Cloudflare Pages           |
| `npm run d1:migrate:remote` | Apply the schema to the remote D1            |

## ⚙️ Configuration

Runtime secrets are set as Cloudflare **environment variables** (and locally in
`.dev.vars`):

- **`AUTH_SECRET`** — secret used to sign session cookies (use a long random string).
- **`SEED_TOKEN`** — token that guards the one-time `/api/seed` endpoint.

The D1 database is bound as **`DB`** (see `wrangler.toml`).

## ☁️ Deploy to Cloudflare Pages (with D1)

This app runs on **Cloudflare Pages** using **D1** (Cloudflare's SQLite) via the
Prisma D1 adapter and `@cloudflare/next-on-pages`. All routes run on the edge runtime.

**One-time setup (run locally with the Wrangler CLI — `npm i -g wrangler` then `wrangler login`):**

```bash
# 1. Create the D1 database
wrangler d1 create supermart-crm
#    → copy the printed database_id into wrangler.toml (replace REPLACE_WITH_YOUR_D1_DATABASE_ID)

# 2. Create the tables in the remote D1
wrangler d1 execute supermart-crm --remote --file=./migrations/0001_init.sql
```

**In the Cloudflare Pages dashboard** (Create application → connect this repo):

| Setting                    | Value                          |
| -------------------------- | ------------------------------ |
| Production branch          | `claude/supermarket-crm-dashboard-ugmszi` |
| Framework preset           | `None`                         |
| Build command              | `npm run pages:build`          |
| Build output directory     | `.vercel/output/static`        |

Then in **Settings → Functions**:
- **D1 bindings** → add binding **Variable name `DB`** → your `supermart-crm` database.
- **Environment variables** → add **`AUTH_SECRET`** (a long random string) and
  **`SEED_TOKEN`** (any secret you choose).
- **Compatibility flags** → add **`nodejs_compat`** (Production *and* Preview).

**After the first deploy, seed the demo data once** by visiting:

```
https://<your-project>.pages.dev/api/seed?token=YOUR_SEED_TOKEN
```

Then log in at `https://<your-project>.pages.dev/login` with **admin@shop.com / admin123**.

> Local Cloudflare preview: `npm run preview` (uses a local D1 — apply the migration
> first with `wrangler d1 execute supermart-crm --local --file=./migrations/0001_init.sql`,
> and put `AUTH_SECRET` / `SEED_TOKEN` in a `.dev.vars` file).

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
