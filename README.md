# AuraPOS

Point of sale and back office for boutiques, sold as a multi-shop (multi-tenant) SaaS.
The full product plan is in [`docs/PLAN.md`](docs/PLAN.md).

## What's built so far (Phase 0–4)

- AuraPOS brand mark and design system: 5 colour themes (Emerald, Rose, Midnight, Sand, Ocean) × light/dark/auto, saved per user
- Self-serve sign-up: creates a shop (tenant), its first store and the owner, with a 14-day trial
- Login with **Shop ID + email + password**; every query is scoped to the signed-in shop
- Roles (Owner, Manager, Cashier, Stock staff, Tailor, Accountant) with permission checks on pages, menus and actions
- **PIN switch-user** screen for the counter
- Dashboard, Team (add staff, activate/deactivate), Settings (shop details incl. GSTIN/UPI validation, appearance), Help
- Audit log of logins, PIN switches, staff and settings changes
- **Phase 2 — Products & stock**: goods, services, rentals and other charges; size × colour variant generator; auto SKUs and EAN-13 barcodes; GST/HSN/SAC; stock status pills; inventory with stock in/out, damaged, count correction and full movement history; barcode label printing (50×25, 38×25 mm rolls, A4 sheets); Excel/CSV import with preview
- **Phase 3 — Billing**: counter screen with barcode scan/search, size–colour picker, goods + services in one cart, line and bill discounts, price changes, customer lookup/creation, salesperson, hold/resume, split payment (cash/UPI with QR/card/bank) with change and credit; manager-PIN approval over the cashier discount limit; GST engine (inclusive/exclusive, garment price slab, CGST/SGST, round-off) with unit tests; invoice numbers per financial year; receipts for 58/80 mm thermal and A5/A4 tax invoice; WhatsApp share; bills list, returns with refunds and restock, cancellations; customers with purchase history and dues; day-end report; live dashboard KPIs and monthly target
- **Phase 4 — Orders & jobs**: customer orders (stock held for the customer, “awaiting stock” when short) and alteration/stitching jobs with stage boards; measurements per customer with templates (blouse, kurti, salwar/pant, lehenga, men's shirt); advances; bill from order with the advance deducted; WhatsApp status messages; two-copy job slips with barcode; due-date calendar; tailor view of assigned jobs; “Due today” on the dashboard
- Placeholder screen for upcoming reports

## Tech

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma + PostgreSQL · jose (signed session cookie) · bcrypt

## Run locally

```bash
cp .env.example .env            # set DATABASE_URL and a random AUTH_SECRET
npm install
npx prisma migrate dev          # create tables
npm run db:seed                 # optional demo shop
npm run dev                     # http://localhost:3000
```

Demo shop (after seeding): Shop ID `demo-boutique`, email `owner@demo.aurapos.in`, password `demo1234`, staff PIN `1234`.

## Checks

```bash
npm run typecheck
npm run lint
npm test          # tax engine + date tests
npm run build
```

Keyboard shortcuts on the billing screen: **F2** search · **F4** hold · **F8** pay.
