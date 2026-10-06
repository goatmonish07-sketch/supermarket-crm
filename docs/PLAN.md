# Boutique POS — Product & Build Plan

> Working name: **Boutique POS** (product name to be chosen — it lives in one config value).
> Status: planning. Nothing is built yet. Plan version 3 — this is a **commercial product sold to many
> boutiques** (multi-tenant SaaS), see §15. v2 added goods & services, stock status, order statuses.

---

## 1. What we're building

A **sellable, multi-shop software product**. Each customer (a boutique owner) signs up, picks a plan,
sets up their own shop(s), staff, branding, bill templates and theme, and runs their business on it.
We (the vendor) run a super-admin console to manage shops, subscriptions, support and updates.

For each shop it is a complete point-of-sale and back-office system: fast billing at the counter
for **goods and services**, printed or shared bills, stock by size and colour with clear **stock
status**, customer orders with **status tracking**, tailoring/alteration jobs, rentals, multiple staff
logins with permissions, simple accounts, and monthly reports.

### About the reference screenshots

The shared demo ("Fernly") is a **project-management dashboard template**, not a POS. We take only the
general *style direction* — calm, card-based, rounded, generous spacing, big KPI numbers, status pills.
Because this is a commercial product, we design **our own visual identity** (name, logo, colour
palette, illustrations, icons set, layouts, copy) and write all code ourselves. Nothing is copied from
that template, so we fully own and can sell everything we ship.

| Reference screen         | Becomes in Boutique POS                                          |
| ------------------------ | ---------------------------------------------------------------- |
| Dashboard KPI cards      | Today's sales, bills, avg bill value, items sold (vs last month) |
| "Project" list           | Open customer orders / alteration jobs with due dates            |
| Team Collaboration       | Staff on shift, sales per staff, status pills                    |
| Project Progress gauge   | Monthly sales target gauge (achieved / pending)                  |
| Time Tracker card        | Shift timer: open/close counter, cash in drawer                  |
| Tasks / Calendar menu    | Orders, jobs & appointments board and delivery calendar          |
| Analytics                | Reports                                                          |
| Team                     | Users, roles, attendance & commission                            |
| Invite member form       | Add staff user (name, role, PIN)                                 |

---

## 2. Tech stack

| Layer          | Choice                                                                 | Why |
| -------------- | ---------------------------------------------------------------------- | --- |
| App            | **Next.js (App Router) + TypeScript**                                  | One codebase for POS screen, back office, and API |
| UI             | **Tailwind CSS** + own component kit (Radix primitives), Lucide icons  | Themeable via CSS variables |
| Font           | Plus Jakarta Sans (UI), JetBrains Mono / Courier Prime (thermal bills) | Calm geometric feel |
| Database       | **PostgreSQL** via **Prisma** (SQLite for local dev)                   | Reliable money/stock transactions, multi-store |
| Auth           | Email+password (+ optional 2FA) for admins, **PIN** quick login at the counter | Fast cashier switching |
| Charts         | Recharts                                                               | Dashboard & reports |
| Printing       | Browser print with paper-size CSS + optional direct ESC/POS (see §7)   | Works with any printer |
| Barcodes / QR  | JsBarcode, QR codes, camera / USB / Bluetooth scanner input            | |
| Exports        | Excel (SheetJS), PDF, Tally-compatible export                          | Reports, GST filing, accountant |
| Messaging      | WhatsApp / SMS / email provider (pluggable)                            | Bills, order-ready alerts, offers |
| Offline        | PWA + IndexedDB bill queue                                             | Keep billing if internet drops |
| Hosting        | Vercel / any Node host + managed Postgres, or a local shop PC          | Decide in §14 |

---

## 3. Users, roles & permissions

| Role       | Typical access |
| ---------- | -------------- |
| **Owner**  | Everything, incl. settings, delete, cost price, profit & accounts |
| **Manager**| Billing, returns, discounts above limit, stock, purchases, orders, reports |
| **Cashier**| Billing, hold/resume, customers, orders intake, own shift report; discount up to a set % |
| **Stock staff** | Products, stock in/adjust/count, labels, purchase receiving; no billing |
| **Tailor / Service staff** | Only jobs and appointments assigned to them; update job status |
| **Accountant** (optional) | Reports, accounts, GST exports; read-only sales |

- Editable permission matrix (every action is a toggle), per store.
- PIN switch-user on the billing screen without logging out; auto-lock after idle time.
- Manager-PIN approval popup for: big discount, price override, refund, bill cancel, negative stock sale.
- **Audit log** of every sensitive action (who, what, before/after, when).
- Staff **attendance** (clock in/out), **sales targets** and **commission/incentive** rules per staff.
- Per-user settings: theme, language, default printer.

---

## 4. Goods & services (item types)

Every sellable thing is an **Item** with a type:

| Type | Examples | Stock tracked? | Tax code |
| ---- | -------- | -------------- | -------- |
| **Goods** | Sarees, kurtis, lehengas, dupattas, jewellery, bags | Yes, per variant | HSN |
| **Service** | Alteration, stitching, fall & pico, embroidery, dyeing, ironing, draping/styling, makeup, gift wrap, delivery charge | No (optional time/staff) | SAC |
| **Rental** | Bridal lehenga, sherwani, jewellery sets on rent | Yes — unit goes Out on rent → Returned | HSN/SAC |
| **Combo / Bundle** | "Kurti + stitching", "Saree + fall-pico + blouse stitching" | Components' stock deducted | Per component |
| **Non-inventory** | Carry bag, custom charges | No | Optional |
| **Gift card / Voucher** | Store gift cards | Balance-tracked | Not taxed at sale (taxed on redeem) |

Service-specific options:
- Fixed price or **price on the spot** (e.g. alteration charge decided at counter).
- Duration, required staff/skill, turnaround days → auto due date.
- Selling a service can **auto-create a job card** (§6) with its status pipeline.
- Separate service revenue reports and per-staff service commission.
- GST: correct rate per HSN/SAC, goods + services on the **same bill** with separate tax lines.

---

## 5. Stock status

Each variant shows a live **stock status** — as a coloured pill on the POS search results, product
list, product page, and filters:

| Status | Meaning | Pill |
| ------ | ------- | ---- |
| **In stock** | Available qty above reorder level | green |
| **Low stock** | At or below reorder level | amber |
| **Out of stock** | Available = 0 | red |
| **On order** | Purchase order raised, not yet received (shows expected date & qty) | blue |
| **Reserved** | Held for a customer order, layaway or hold bill | purple |
| **In alteration** | Taken from stock for altering / with tailor | teal |
| **On rent** | Rental unit currently with a customer | indigo |
| **In transit** | Being transferred between stores | grey |
| **Damaged / Quarantine** | Not sellable, awaiting return to vendor or write-off | dark red |
| **Pre-order / Backorder** | Can be sold before stock arrives (if enabled) | outlined |
| **Discontinued** | Sell-through only, no reorder | struck |

Quantities tracked per variant per store:
`On hand = Available + Reserved + In alteration + Damaged`, plus `On order` and `In transit` shown separately.

- Low-stock alerts on dashboard + optional daily WhatsApp/email digest.
- **Auto reorder suggestions** (based on sales velocity and reorder level) → one-click purchase order.
- Selling when out of stock: block, warn, or allow with manager PIN (setting).
- Stock aging by **season/collection** (e.g. "Diwali 2026", "Summer 2026") → clearance suggestions.

---

## 6. Orders & status tracking

### 6.1 Customer orders (special order / pre-order / booking / online)
Status pipeline (Kanban board + list + timeline per order):

```
Draft → Confirmed → Awaiting stock → In alteration/stitching → Ready
      → Packed → Out for delivery / Ready for pickup → Delivered → Completed
(any stage) → On hold | Cancelled  ·  after delivery → Return requested → Returned
```
- Advance payment, balance due, payment status pill (**Unpaid / Partly paid / Paid / Refunded**).
- Reserves stock automatically (stock status → *Reserved*); releases on cancel.
- Delivery: pickup or home delivery, address, delivery person, charges, delivery slip.
- Customer notified on WhatsApp/SMS at chosen statuses ("Your order is ready for pickup").
- Due-date calendar and overdue alerts.
- Convert order → final bill in one click.

### 6.2 Alteration & stitching jobs
```
Received → Measurement taken → Cutting → Stitching → Trial/Fitting → Final touches
         → Ready → Delivered        (Rework loops back to Stitching)
```
- Job card: customer, items, **measurements**, design notes & reference photos, assigned tailor,
  trial date, due date, charges, advance, balance.
- Workshop slip and customer slip (with job number barcode/QR for quick lookup).
- Tailor-wise workload view; overdue highlighting.

### 6.3 Rentals
```
Booked → Ready → Out on rent → Returned → Inspected → (Cleaned) → Available
                              ↘ Overdue (late fee)   ↘ Damaged (deduct deposit)
```
- Rental period, security deposit, late fee per day, damage deductions, deposit refund.
- Availability calendar per rental item (no double-booking).

### 6.4 Purchase orders (from suppliers)
```
Draft → Sent → Partially received → Received → Billed → Closed   |  Cancelled
```
- Expected dates feed the **On order** stock status.

### 6.5 Other documents with status
| Document | Statuses |
| -------- | -------- |
| Sale bill | Paid · Partly paid · Credit (due) · Cancelled · Returned · Partly returned |
| Quotation / Estimate | Draft · Sent · Accepted (→ order/bill) · Expired · Rejected |
| Layaway (pay in parts) | Active · Completed · Cancelled (refund/forfeit) |
| Sales return / Exchange | Requested · Approved · Refunded / Credit note issued |
| Stock transfer | Requested · Dispatched · In transit · Received · Discrepancy |
| Purchase return to vendor | Draft · Sent · Credit received |
| Appointment | Booked · Confirmed · Checked-in · Done · No-show · Cancelled |

All statuses use the same coloured pill component (as in the reference's Completed / In Progress / Pending).

---

## 7. Billing (POS screen) — the core

- Scan barcode / QR (USB, Bluetooth, phone camera) or search by name/SKU; goods and services in one cart.
- Variant picker for size/colour; stock status pill shown before adding.
- Cart: qty, line discount (% or ₹), price override (permission), salesperson per line, notes per line
  ("shorten sleeves 1 inch" → creates alteration job).
- Bill discount, coupon, offer auto-apply, loyalty points redeem, gift card, credit note / store credit.
- Attach customer by phone (create on the fly), see their dues, points and last purchases.
- **Hold / resume** multiple bills; **quotation** mode; **layaway** mode.
- **Split payment**: Cash, Card, UPI (dynamic QR with exact amount), Wallet, Gift card, Credit (khata), Bank transfer.
- Auto GST: CGST/SGST or IGST, inclusive/exclusive, round-off; B2B bill with customer GSTIN.
- After payment: **Print**, WhatsApp bill (PDF/link), SMS, Email, or none; open cash drawer.
- **Returns & exchanges** with reason codes → refund, credit note, or exchange in one flow; return policy days check.
- Reprint, duplicate copy, cancel bill (manager).
- Keyboard shortcuts; touch-friendly tablet layout; phone layout for small counters.
- Optional **customer-facing display** (second screen showing cart and UPI QR).

---

## 8. Printing, paper modes & bill templates

### Paper modes
| Mode | Use |
| ---- | --- |
| **Thermal 58 mm** (2") | Small counter printers |
| **Thermal 80 mm** (3") | Standard receipt printers |
| **A5** | Half-page tax invoice |
| **A4** | Full GST tax invoice, B2B, quotations, purchase orders |
| **Labels** | Barcode tags (50×25 mm, 38×25 mm, hanging tags, A4 sticker sheets) |

### Printer connection
1. **Browser print** (default, any printer) — paper-size CSS; Chrome kiosk silent printing.
2. **Direct thermal (ESC/POS)** — WebUSB / Web Serial / Web Bluetooth: instant print, auto-cut, **cash drawer kick**.
3. **Network printers** (LAN/Wi-Fi, port 9100) via a small local print helper.
- Per-device printer profiles (bill printer, label printer, job-slip printer), copies, test print.

### Template designer
- Ready templates: **Classic, Minimal, Modern, Boutique Elegant, GST Detailed, Compact**.
- Show/hide and reorder blocks: logo, store details, GSTIN, bill no/date, cashier, customer, items table
  columns (HSN/SAC, size, colour, MRP, discount, tax), tax breakup, "You saved ₹…", payments,
  loyalty balance, UPI QR, terms & return policy, thank-you note, social handles, order/job barcode.
- **Font style**: font family per template (thermal-safe mono/sans; sans/serif for A4), size S/M/L,
  bold header, alignment, line spacing.
- Regional-language text option; live preview per paper size.
- Separate templates for: sale bill, quotation, order slip, job slip, rental agreement, credit note,
  delivery slip, purchase order, Z report, barcode labels.

---

## 9. Themes & appearance
- Theme tokens via CSS variables — the whole app re-skins instantly.
- Presets: **Forest** (default green/cream), **Rose Blush**, **Midnight** (dark), **Sand**, **Ocean**.
- Light / dark / system mode for each; custom accent colour; store logo in sidebar.
- Density: comfortable / compact; font size scale for accessibility.
- Saved per user.

---

## 10. Remaining modules

### 10.1 Dashboard
- KPI cards: Today's sales, Bills, Avg bill value, Items sold, Services revenue — vs last month.
- Monthly target gauge; sales trend; top products/categories; payment-mode split.
- Widgets: low stock, orders by status, jobs due today, rentals due back, dues to collect,
  birthdays today, staff on shift. Quick actions: New Bill, New Order, Add Product, Import.

### 10.2 Products & catalog
- Categories, sub-categories, brands, **collections/seasons**, tags.
- Attributes: size, colour, fabric, pattern, occasion, work type (custom attributes allowed).
- **Variant matrix generator** (sizes × colours) with own SKU/barcode/stock.
- MRP, selling price, cost (hidden from cashier), wholesale price, **price lists** (retail/wholesale/VIP).
- Bulk price change & **markdown/clearance** with automatic re-label prompt.
- Images, description; bulk Excel import/export; duplicate product.
- **Consignment items** (vendor-owned stock sold on commission, settled monthly).
- Barcode **label printing** with layout designer.

### 10.3 Inventory & purchasing
- Stock per variant per store; full movement ledger (sale, return, purchase, adjust, transfer, alteration, rental).
- Suppliers, purchase orders, goods receipt (scan to receive), supplier bills, payments due, purchase returns.
- Stock adjustments with reasons; **stock count/audit** (scan-based, variance report).
- Reorder levels, auto reorder suggestions; stock transfers between stores.

### 10.4 Customers (CRM)
- Profile, birthday/anniversary, address, tags/groups, notes, preferences (sizes, colours).
- **Measurements** with history; photos.
- Purchase, order, job and rental history; total spend; last visit.
- **Loyalty** points + **tiers** (Silver/Gold/Platinum), referral rewards.
- Store credit, **dues/khata** with reminders, credit limit.
- Bulk WhatsApp/SMS campaigns (new arrivals, festival offers, birthday wishes) with opt-out.
- Feedback/rating after purchase.

### 10.5 Appointments
- Book fittings, measurements, styling, bridal consultations; staff calendar; reminders; no-show tracking.

### 10.6 Offers, gift cards & loyalty
- Discount rules (% / flat), by category/brand/collection/customer group, date range, happy hours.
- Buy X Get Y, bundle price, minimum bill offers, coupon codes with limits.
- Gift cards / vouchers (sell, check balance, redeem, expiry).
- Max discount per role.

### 10.7 Cash, shifts & accounts (lite)
- Open/close shift, cash counted vs expected, over/short; cash in/out; **Z report**.
- Expenses with categories and receipts photo.
- Cash book, bank book, receivables (customer dues), payables (supplier dues).
- Simple **Profit & Loss** per month; export to Tally / accountant Excel.

### 10.8 GST & compliance
- HSN/SAC master, rate slabs, inclusive/exclusive.
- B2B / B2C invoices, credit/debit notes, financial-year invoice numbering.
- **GSTR-1 / GSTR-3B summary exports**, HSN summary.
- E-invoice (IRN) & e-way bill hooks (when turnover requires).

### 10.9 Reports (daily / monthly / custom; Excel & PDF; schedulable)
- **Sales**: by day, month, product, variant, category, brand, collection, size, colour, staff, payment mode, hour.
- **Goods vs services** revenue; service jobs by type & tailor; turnaround time.
- **Monthly report**: vs previous month & same month last year; target achievement.
- **Orders**: by status, overdue, conversion (quotation → bill), cancellations.
- **Rentals**: utilisation, revenue, late fees, damages.
- **Stock**: current stock & valuation, stock status summary, low/dead stock, aging by season, movement ledger, audit variance.
- **Purchases**: by supplier, pending POs, payables.
- **Customers**: top customers, new vs returning, dues, loyalty liability, campaign results.
- **Staff**: sales, commission, attendance, discounts given, cancellations.
- **Profit**: gross margin by product/category, P&L. **GST** reports (§10.8).
- Monthly report auto-sent to the owner on WhatsApp/email.

### 10.10 Settings
- Store(s) profile, logo, GSTIN, UPI ID, bank details.
- Invoice series per document type; tax; round-off; return policy days.
- Bill templates & printers; themes; users, roles & permissions; payment modes.
- Loyalty, discounts limits, stock rules (negative stock, reserve on order), order/job status names editable.
- Notification templates (WhatsApp/SMS/email) and which status triggers them.
- Backup & restore, data import/export, data reset (owner only).

### 10.11 Later / optional
- **Online catalogue / storefront** with live stock status and WhatsApp ordering.
- Marketplace sync (Instagram shop, etc.), payment gateway links.
- Multi-store with central dashboard; franchise view.
- Mobile owner app (PWA) for reports on the go.
- Multi-language UI.

---

## 11. Data model (draft)

Every table below carries a `tenantId`; one tenant = one customer business (which may have several stores).

```
Platform ─┬─ Tenant (business, plan, subscription status, branding, custom domain)
          │    └─ Subscription, PlatformInvoice, UsageCounter, FeatureFlags
          ├─ PlatformAdmin (vendor staff) ── SupportTicket, Announcement
          └─ Tenant ─▶ Store(s) ─▶ everything below

Store ─┬─ User (role, pin, theme) ── Attendance, AuditLog, CommissionRule
       ├─ Settings (invoice series, tax, loyalty, stock rules, templates, printers, themes, notifications)
       ├─ Category / Brand / Collection
       ├─ Item (type: GOODS|SERVICE|RENTAL|COMBO|NON_INVENTORY|GIFT_CARD, hsn/sac, tax)
       │    └─ Variant (size, colour, sku, barcode, prices, reorder level, status flags)
       │         ├─ StockLevel (available, reserved, inAlteration, onRent, damaged, inTransit, onOrder)
       │         └─ StockMovement (type, qty, reason, ref)
       ├─ PriceList, Offer, Coupon, GiftCard
       ├─ Supplier ── PurchaseOrder (status) ── PurchaseItem, GoodsReceipt, PurchaseReturn
       ├─ Customer ── Measurement, LoyaltyLedger, CreditLedger, Appointment
       ├─ Quotation (status) ──▶ Order (status, payment status) ── OrderItem, OrderStatusHistory, Delivery
       ├─ Sale (status) ─┬─ SaleItem (item/variant, qty, price, discount, tax, salesperson)
       │                 ├─ Payment (mode, amount, ref)
       │                 └─ Return ── ReturnItem / CreditNote
       ├─ Job (alteration/stitching, status) ── JobItem, JobStatusHistory
       ├─ Rental (status, deposit) ── RentalItem
       ├─ Layaway, HeldBill
       ├─ StockTransfer (status), StockCount
       ├─ Shift ── CashEntry, Expense
       └─ MonthlyTarget, NotificationLog
```

Money stored as integer paise; every stock change is a movement row; every status change is a history row
(who/when), so timelines and reports are always accurate.

---

## 12. Screen list

1. Login + PIN lock screen
2. Dashboard
3. **Billing (POS)** full-screen, + customer display
4. Bills, bill detail, returns & exchanges, quotations, layaways
5. **Orders** board/list/detail with status timeline
6. **Jobs** (alteration/stitching) board, job card, tailor view
7. **Rentals** board + availability calendar
8. Calendar (orders, jobs, rentals, appointments in one view)
9. Products & services list (with stock status filters), item editor + variant matrix, categories, collections, price lists
10. Barcode label printing
11. Inventory: stock overview by status, adjustments, stock count, transfers, reorder suggestions
12. Purchases: suppliers, purchase orders, receiving, supplier bills & payments
13. Customers list, profile (history, measurements, loyalty, dues), campaigns
14. Appointments
15. Offers, coupons, gift cards
16. Shifts & cash, expenses, accounts (cash/bank book, P&L)
17. Reports (tabbed) + export + schedules
18. Team: users, roles & permissions, attendance, commission
19. Settings (store, tax & invoice, templates designer, printers, themes, notifications, stock rules, backup)
20. Help

---

## 13. Build phases

| Phase | Scope | Result |
| ----- | ----- | ------ |
| **0. Brand & design system** | Product name, logo, colour palette, typography, component library, theme presets | Our own identity, ready to sell |
| **1. Foundation (multi-tenant)** | Project setup, tenant isolation, sign-up + onboarding wizard, theme system + layout, auth, users/roles/PIN, store settings, audit log | Any shop can sign up and log in |
| **2. Catalog & stock** | Goods & services items, variants, barcodes & labels, stock levels + **stock status**, adjustments, Excel import | Items ready to sell |
| **3. Billing** | POS screen, goods + services cart, discounts, customers, split payments, hold/resume, GST, invoice series, **print templates (58/80 mm, A4/A5)**, returns/exchange, shifts & Z report | **Shop can start billing** |
| **4. Orders & jobs** | Customer orders with **status pipeline**, alteration/stitching jobs, measurements, calendar, WhatsApp status alerts | Orders tracked end to end |
| **5. Reports & dashboard** | Dashboard KPIs & gauge, daily/monthly/GST/stock/staff/order reports, Excel/PDF, scheduled monthly report | Owner gets monthly reports |
| **6. Purchasing & accounts** | Suppliers, purchase orders (statuses → *On order*), receiving, payables, expenses, cash/bank book, P&L | Full stock & money cycle |
| **7. Growth extras** | Rentals, loyalty tiers, offers/coupons, gift cards, quotations, layaway, appointments, campaigns, consignment | All boutique features |
| **8. Scale** | Direct ESC/POS & cash drawer, customer display, offline mode, multi-store & transfers, e-invoice, online catalogue | Ready to grow |
| **9. Commercial launch** | Plans & subscription billing, free trial, super-admin console, marketing website, demo shop, help centre, legal pages, monitoring & backups | **Ready to sell** |

Phases 1–3 + a minimal Phase 9 (manual subscriptions, landing page, demo) = **first sellable version (MVP)**.
Each phase ends with a working, demo-able build pushed to the repo.

---

## 14. Decisions needed from you

1. **Product name** (and do you have a logo or should we design one?).
2. **Delivery model**: cloud SaaS (monthly/yearly subscription — recommended), installable desktop
   with licence key, or both?
3. **Target market**: India only (GST, ₹, UPI, regional languages) or also other countries?
4. **Pricing idea**: plans and price points (draft in §15.2 to react to).
5. **White-label** for resellers — needed at launch or later?
6. **WhatsApp**: manual "open WhatsApp" sharing (free) or automatic via WhatsApp Business API (paid, per message)?
7. **Payment gateway** for collecting subscriptions: Razorpay, Cashfree, Stripe?
8. A **pilot boutique** to test with before launch?

---

## 15. Selling it: product & SaaS layer

### 15.1 Multi-tenant architecture
- One cloud app serves all customers; **strict tenant isolation** (tenant ID on every row, enforced in
  one data-access layer + Postgres row-level security as a second guard).
- Each tenant: own sub-domain (`shopname.ourproduct.in`), optional **custom domain**.
- Per-tenant settings, branding, templates, themes, currency, language, time-zone, tax regime.
- Nothing hard-coded to one shop — every label, tax, status name, template and category is configurable.

### 15.2 Plans, trial & subscription billing (draft — to adjust)
| Plan | For | Limits / features |
| ---- | --- | ----------------- |
| **Free trial** (14 days) | Everyone | All features, watermark on bills after trial ends |
| **Starter** | Small single counter | 1 store, 2 users, billing, stock, customers, basic reports |
| **Growth** | Typical boutique | 1 store, 5 users, + orders & jobs, services, loyalty, offers, all reports, WhatsApp share |
| **Pro** | Busy / multi-branch | 3 stores, 15 users, + rentals, purchases & accounts, transfers, campaigns, API |
| **Enterprise** | Chains / franchises | Unlimited, white-label, custom domain, priority support |
- Monthly / yearly billing (yearly discount), add-ons (extra store, extra user, WhatsApp message packs, SMS credits).
- Feature flags + usage limits enforced per plan; upgrade/downgrade prompts in-app.
- Automated invoices (GST invoices for our own sales), payment retries, grace period, read-only mode
  when unpaid (data never deleted without notice).
- Coupons & referral discounts for our sales; reseller/partner commissions.

### 15.3 Onboarding (self-serve)
- Sign up → verify phone/email → **setup wizard**: shop details, logo, GST, invoice prefix, theme,
  printer test, add first staff, import products (Excel template) or load **sample data**.
- Interactive product tour; checklist ("Make your first bill").
- Data import from Excel and common other POS exports.

### 15.4 Vendor super-admin console (for us)
- All tenants: plan, status, usage, last active, revenue (MRR/ARR, churn, trial conversions).
- Manage subscriptions, extend trials, apply discounts, suspend/restore.
- **Impersonate** (support login with tenant permission, fully logged).
- Feature flags / staged roll-outs, in-app announcements & "what's new".
- Support tickets / chat inbox, help-centre article management.
- System health, error monitoring, background jobs, backups.

### 15.5 Trust, security & reliability (needed to sell)
- HTTPS everywhere, hashed passwords, optional 2FA for owners, session/device management.
- Daily automated backups + point-in-time restore; tenant self-service **data export** (they own their data).
- Rate limiting, audit logs, encrypted secrets; uptime monitoring and status page.
- Legal: Terms of Service, Privacy Policy, refund policy, data-processing terms (India DPDP Act).
- Versioned database migrations so all tenants upgrade safely; zero-downtime deploys.

### 15.6 Go-to-market assets
- **Marketing website**: features, pricing, demo video, testimonials, FAQs, sign-up.
- **Live demo shop** with sample boutique data (resets nightly).
- Help centre, video tutorials, printer setup guides; WhatsApp support number.
- Recommended hardware list (printers, scanners, drawers) — optional hardware bundles via partners.
- Android/iOS: installable PWA first; store apps later.

### 15.7 Delivery options
| Option | Pros | Cons |
| ------ | ---- | ---- |
| **Cloud SaaS** (recommended first) | Recurring revenue, instant updates, one codebase, works on any device | Needs internet (mitigated by offline mode, §8 phase) |
| Desktop (Electron) + licence key | Works fully offline, one-time sale appeal | Updates & support harder, piracy risk |
| Self-hosted for enterprise | Big clients that want own server | Custom installs |
