# Boutique POS — Product & Build Plan

> Working name: **Boutique POS** (rename any time — the name lives in one settings value).
> Status: planning. Nothing is built yet.

---

## 1. What we're building

A complete point-of-sale and back-office system for a clothing boutique: fast billing at the counter,
printed or shared bills, stock by size and colour, customers and loyalty, tailoring/alteration orders,
multiple staff logins with permissions, and monthly reports.

### About the reference screenshots

The shared demo ("Fernly") is a **project-management dashboard template**, not a POS. We are taking
its *look and feel* as inspiration only — calm deep-green palette, soft off-white rounded cards, pill
buttons, big KPI numbers, slide-out side menu, pastel initials avatars, coloured status pills, a
half-donut progress gauge. All code, the name, logo, icons and wording will be our own.

How the reference screens map onto the POS:

| Reference screen         | Becomes in Boutique POS                                          |
| ------------------------ | ---------------------------------------------------------------- |
| Dashboard KPI cards      | Today's sales, bills, avg bill value, items sold (vs last month) |
| "Project" list           | Recent bills / pending alteration orders with due dates          |
| Team Collaboration       | Staff on shift, sales per staff, status pills                    |
| Project Progress gauge   | Monthly sales target gauge (achieved / pending)                  |
| Time Tracker card        | Shift timer: open/close counter, cash in drawer                  |
| Tasks / Calendar menu    | Alteration & stitching jobs, delivery calendar                   |
| Analytics                | Reports                                                          |
| Team                     | Users & roles                                                    |
| Invite member form       | Add staff user (name, role, PIN)                                 |

---

## 2. Tech stack

| Layer          | Choice                                                                 | Why |
| -------------- | ---------------------------------------------------------------------- | --- |
| App            | **Next.js (App Router) + TypeScript**                                  | One codebase for POS screen, back office, and API |
| UI             | **Tailwind CSS** + own component kit (Radix primitives), Lucide icons  | Themeable via CSS variables |
| Font           | Plus Jakarta Sans (UI), JetBrains Mono / Courier Prime (thermal bills) | Similar calm geometric feel |
| Database       | **PostgreSQL** via **Prisma** (SQLite for local dev)                   | Reliable money/stock transactions, multi-store later |
| Auth           | Email+password for admins, **4–6 digit PIN** quick login at the counter | Fast cashier switching |
| Charts         | Recharts                                                               | Dashboard & reports |
| Printing       | Browser print with paper-size CSS + optional direct ESC/POS (see §5)   | Works with any printer |
| Barcodes       | JsBarcode (labels), camera / USB scanner input                         | |
| Exports        | Excel (SheetJS), PDF                                                   | Reports & GST filing |
| Offline        | PWA + IndexedDB bill queue (Phase 5)                                   | Keep billing if internet drops |
| Hosting        | Vercel / any Node host + managed Postgres, or a local shop PC          | Decide in §10 |

---

## 3. Users, roles & permissions

Roles (editable permission matrix, per-store):

| Role       | Typical access |
| ---------- | -------------- |
| **Owner**  | Everything, incl. settings, delete, cost price, profit reports |
| **Manager**| Billing, returns, discounts above limit, stock, purchases, reports (no owner settings) |
| **Cashier**| Billing, hold/resume, customers, own shift report; discount up to a set % |
| **Stock staff** | Products, stock in/adjust, labels; no billing |
| **Tailor** (optional) | Sees only alteration/stitching jobs assigned to them |

- PIN switch-user on the billing screen without logging out.
- Per-user settings: theme, language, default printer.
- **Audit log**: who billed, edited price, gave discount, deleted, refunded — with timestamps.
- Manager-PIN approval popup for actions beyond a cashier's limit (big discount, refund, price override, bill cancel).

---

## 4. Modules & features

### 4.1 Dashboard
- KPI cards: Today's sales, Bills count, Avg bill value, Items sold — each with "▲ vs last month".
- Monthly target gauge (achieved / remaining).
- Sales trend (last 30 days), top 5 products, top categories, payment-mode split.
- Low-stock list, today's alteration deliveries, staff on shift.
- Quick actions: **New Bill**, Add Product, Import Data.

### 4.2 Billing (POS screen) — the core
- Scan barcode (USB/Bluetooth scanner or phone camera) or search by name/SKU.
- Variant picker for size/colour when a parent product is chosen.
- Cart: qty, line discount (% or ₹), price override (permission), remove, salesperson per line.
- Bill-level discount, coupon code, loyalty points redeem, store credit / credit note redeem.
- Attach customer by phone (create on the fly).
- **Hold / resume bills** (multiple parked carts).
- **Split payment**: Cash, Card, UPI, Wallet, Credit (pay later); cash change calculator.
- Auto GST split (CGST/SGST or IGST), round-off.
- After payment: **Print**, **WhatsApp bill link**, SMS / Email, or no print.
- **Returns & exchanges**: look up bill, return items → refund or credit note; exchange in one flow.
- Reprint any past bill; cancel bill (manager).
- Keyboard shortcuts (F2 search, F4 hold, F8 pay, F9 print, Esc clear) for speed.
- Touch-friendly layout for tablets; works on phone for small counters.

### 4.3 Products & catalog
- Categories (Sarees, Kurtis, Lehengas, Western, Kids, Accessories…), sub-categories, brands.
- Attributes: Size, Colour, Fabric, Pattern, Occasion (custom attributes allowed).
- **Variant matrix generator**: pick sizes × colours → all variants created with own SKU/barcode/stock.
- Prices: MRP, selling price, cost price (hidden from cashier), wholesale price.
- Tax: GST rate + HSN code per product/category; tax-inclusive or exclusive pricing.
- Images, description, tags.
- Bulk import/export via Excel/CSV.
- **Barcode label printing**: choose label size/layout, fields (name, size, MRP, barcode), qty per variant.

### 4.4 Inventory
- Stock per variant per store; full stock movement history.
- Stock in (purchase), adjustments with reason (damage, lost, gift), stock count / audit.
- Suppliers, purchase orders, goods receipt, supplier bills & payments due.
- Low-stock alerts (per-variant reorder level), dead-stock report.
- Stock transfer between stores (multi-store, Phase 5).

### 4.5 Customers (CRM)
- Profile: name, phone, email, birthday, anniversary, address, notes, tags/groups.
- **Measurements** (bust, waist, hip, length, sleeve…) saved per customer for tailoring.
- Purchase history, total spend, last visit, favourite categories.
- **Loyalty points** (earn rule + redeem rule), store credit balance, pending dues (credit sales).
- Birthday/anniversary list for offers; WhatsApp message templates.

### 4.6 Alterations & custom stitching (boutique-specific)
- Job card: customer, items, measurements, design notes/photos, tailor, due date, charges.
- Advance payment and balance collected on delivery (linked to billing).
- Status pipeline: Received → Cutting → Stitching → Ready → Delivered (coloured pills).
- **Calendar** view of due deliveries; overdue alerts.
- Print job slip for customer and workshop.

### 4.7 Offers & pricing
- Discount rules: % / flat, by category/brand/product, date range (festival sale).
- Buy X Get Y, bundle price, minimum bill value offers.
- Coupon codes with usage limits.
- Max discount per role.

### 4.8 Cash & shifts
- Open shift with opening cash; close shift with counted cash → over/short.
- Cash in/out entries (petty expenses), expense categories.
- **Day-end (Z) report** printable on thermal paper.

### 4.9 Reports (daily / monthly / custom range, export Excel & PDF)
- **Sales**: by day, month, product, category, brand, size, colour, staff, payment mode, hour of day.
- **Monthly report**: month vs previous month & same month last year, target achievement.
- **Profit**: gross margin by product/category (owner only).
- **GST**: tax summary, HSN-wise summary, B2B/B2C split (GSTR-1 ready export).
- **Stock**: current stock & valuation, low stock, dead stock, movement ledger.
- **Customers**: top customers, new vs returning, dues outstanding, loyalty liability.
- **Staff**: sales & commission per salesperson, discounts given, bills cancelled.
- **Returns**: return/exchange report.
- Scheduled monthly report emailed/WhatsApp-shared to owner (Phase 5).

### 4.10 Settings
- Store profile: name, logo, address, GSTIN, phone, UPI ID (for QR on bill).
- Invoice numbering (prefix, financial-year reset), tax settings, round-off.
- **Bill templates & printers** (§5), **Themes** (§6).
- Users & roles, permission matrix.
- Payment modes on/off, loyalty rules, discount limits.
- Backup & restore (download full data), data import.

### 4.11 Help
- Built-in guide pages, keyboard-shortcut sheet, printer setup help.

---

## 5. Printing, paper modes & bill templates

### Paper modes
| Mode            | Use |
| --------------- | --- |
| **Thermal 58 mm** (2")  | Small counter printers |
| **Thermal 80 mm** (3")  | Standard receipt printers |
| **A5**          | Half-page tax invoice |
| **A4**          | Full GST tax invoice, B2B |
| Label sizes     | Barcode tags (e.g. 50×25 mm, 38×25 mm, A4 sticker sheets) |

### Printer connection options
1. **Browser print (default, works everywhere)** — paper-size-specific CSS; set the printer once in the
   OS/browser; supports "silent" kiosk printing in Chrome.
2. **Direct thermal (ESC/POS)** — via **WebUSB / Web Serial / Web Bluetooth** in Chrome: instant printing,
   auto paper cut, **cash drawer kick**. Works with common Epson-compatible 58/80 mm printers.
3. **Network printers** (LAN/Wi-Fi ESC/POS, port 9100) — through a small local print helper (Phase 5).
- Per-device printer profiles: which printer for bills, which for labels, copies count.
- Test-print button in settings.

### Bill template designer
- Choose from **4–6 ready templates** (Classic, Minimal, Modern, Boutique Elegant, GST Detailed, Compact).
- Toggle blocks on/off and reorder: logo, store name/address, GSTIN, bill no/date, cashier, customer,
  items table columns (HSN, size, colour, MRP, discount, tax), tax breakup, savings line ("You saved ₹…"),
  payment details, loyalty points balance, UPI QR, terms & return policy, thank-you note, social handles.
- **Font style**: choose font family per template (mono/sans/serif for A4; thermal-safe fonts for 58/80 mm),
  font size (S/M/L), bold header, alignment.
- Header/footer custom text, language (English + regional language option).
- Live preview for each paper size before saving.
- Same designer drives WhatsApp/PDF bill output.

---

## 6. Themes & appearance
- Theme tokens via CSS variables so the whole app re-skins instantly.
- Preset themes:
  - **Forest** (default — deep green, soft cream cards; inspired by the reference look)
  - **Rose Blush** (pink/mauve — boutique feel)
  - **Midnight** (dark mode)
  - **Sand** (warm beige/gold)
  - **Ocean** (blue/teal)
- Light / dark / system mode for every preset.
- Custom accent colour picker + store logo in the sidebar.
- Density: comfortable / compact (more items visible on billing screen).
- Saved per user.

---

## 7. Data model (first draft)

```
Store ─┬─ User (role, pin, theme) ── AuditLog
       ├─ Settings (invoice, tax, loyalty, print templates, printers, theme)
       ├─ Category ── Product ── Variant (size, colour, sku, barcode, price, cost, stock)
       │                         └─ StockMovement (type, qty, reason, ref)
       ├─ Supplier ── PurchaseOrder ── PurchaseItem
       ├─ Customer ── Measurement, LoyaltyLedger, CreditLedger
       ├─ Sale (invoice no, totals, tax) ─┬─ SaleItem (variant, qty, price, discount, tax, salesperson)
       │                                  ├─ Payment (mode, amount, ref)
       │                                  └─ Return ── ReturnItem / CreditNote
       ├─ HeldBill
       ├─ AlterationJob ── JobItem, JobStatusHistory
       ├─ Offer / Coupon
       ├─ Shift (open/close cash) ── CashEntry / Expense
       └─ MonthlyTarget
```

Money stored as integer paise; every stock change written as a movement row (never edit stock directly).

---

## 8. Screen list

1. Login (email/password) + PIN lock screen
2. Dashboard
3. **Billing (POS)** — full-screen mode
4. Bills list / bill detail / returns & exchange
5. Products list, product editor (with variant matrix), categories, attributes
6. Barcode label printing
7. Inventory: stock list, adjustments, stock count, purchases, suppliers
8. Customers list, customer profile (history, measurements, loyalty, dues)
9. Alterations: board (status columns), calendar, job card
10. Offers & coupons
11. Shifts & cash, expenses
12. Reports (tabs per report type) + export
13. Settings: store, tax & invoice, bill templates designer, printers, themes, users & roles, payments, loyalty, backup
14. Help

---

## 9. Build phases

| Phase | Scope | Result |
| ----- | ----- | ------ |
| **1. Foundation** | Project setup, theme system + layout (sidebar, top bar, cards), auth, users/roles/PIN, store settings | Logged-in shell with themes working |
| **2. Catalog & stock** | Categories, products, variant matrix, barcode generation, label printing, stock in/adjust, Excel import | Products ready to sell |
| **3. Billing** | POS screen, cart, discounts, customers, split payments, hold/resume, GST calc, invoice numbering, **print templates (58/80 mm, A4/A5)**, reprint, returns/exchange | **Shop can start billing** |
| **4. Reports & dashboard** | Dashboard KPIs & gauge, daily/monthly/GST/stock/staff reports, Excel/PDF export, shifts & Z report | Owner gets monthly reports |
| **5. Boutique extras** | Alterations & stitching jobs + calendar, measurements, loyalty, offers/coupons, WhatsApp bill sharing, suppliers & purchases, direct ESC/POS printing & cash drawer, offline mode, multi-store | Full feature set |

Each phase ends with a working, demo-able build pushed to the repo.

---

## 10. Decisions needed from you

1. **Shop name & logo** for branding (or keep "Boutique POS" for now).
2. **Single store or multiple branches?**
3. **Where does it run?** Online (cloud, access from anywhere) or on one shop PC (works without internet)?
4. **GST**: registered (need GSTIN, HSN on bills) or not?
5. **Printer model(s)** you have or plan to buy (58 mm / 80 mm thermal, A4, label printer).
6. **Tailoring/alterations** — do you take stitching orders? (decides priority of §4.6)
7. Languages needed on the app/bill besides English.
