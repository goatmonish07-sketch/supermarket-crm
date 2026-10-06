# AuraPOS Design System — MASTER

Source of truth for every screen. Page-specific overrides live in `design-system/pages/<page>.md`
(deviations only). Tokens are implemented in `app/globals.css` + `tailwind.config.ts`.

## 1. Brief
- **Product**: B2B SaaS point-of-sale + back office for clothing boutiques (India-first).
- **Users**: owners (desk + phone), cashiers (counter PC / tablet, fast and repetitive), stock staff (phone, in the store room), tailors (phone).
- **Context**: busy counter, customers waiting, mixed tech skill, bright shop lighting, touch + scanner + keyboard.
- **Keywords**: calm, premium-boutique, trustworthy, fast, legible.

## 2. Decisions
1. **Pattern** — App: sidebar shell + card pages. Marketing site: Hero-Centric + Feature showcase + Trust.
2. **Style** — **Soft UI Evolution**: rounded cards (28px), soft single-layer shadows, generous whitespace,
   pill buttons, one dark "aura" feature card per page for emphasis. No glassmorphism except the top bar.
3. **Colour** — semantic tokens only (`bg, surface, surface-2, border, fg, muted, primary(-strong/-soft/-fg),
   accent, success, warning, danger, info`). 5 presets × light/dark. Every text pair ≥ 4.5:1
   (checked with a script; warning darkened to 160 98 16 for light mode).
4. **Typography** — Plus Jakarta Sans (UI, 400/500/600/700), JetBrains Mono (codes, SKUs, barcodes, timers).
   Scale: 12 · 14 · 15 (body in dense tables) · 16 (body) · 18 · 20 · 24 · 30 · 36/48 (page titles, KPIs).
   Prices, quantities, timers: `tabular-nums`.
5. **Effects** — radius: card 28px, input/tile 16px, pill 9999px. Shadow: `shadow-card` only; `shadow-glow`
   reserved for the primary CTA. Transitions 150–200ms ease-out; respect `prefers-reduced-motion`.
6. **Anti-patterns** — emoji as icons; colour-only status; neon/AI purple gradients; tiny (<44px) targets at
   the counter; placeholder-only labels; modal-heavy flows for primary navigation; dense spreadsheets on phones
   (use cards < 768px).

## 3. Density
- Dashboard/marketing: spacious (16–48px gaps).
- Catalogue/inventory tables: medium-dense (row height ≥ 56px, 12–16px cell padding) — boutique lists are
  scanned visually, not crunched.
- Billing (Phase 3): dense but touch-safe (44px min targets).

## 4. Components
| Component | Rules |
| --------- | ----- |
| Buttons | `.btn-primary` (one per view), `.btn-outline`, `.btn-ghost`, `.btn-danger`. Height 44px (h-11), 48px for main CTAs. Spinner + disabled while pending. |
| Inputs | Visible `<label>`; 48px tall; helper text below; error text below the field with `role="alert"`; password fields have show/hide. |
| Status pill | `StatusPill` = colour + text (+ icon for stock status). Never colour alone. |
| Stock status | In stock (success, check), Low (warning, alert-triangle), Out (danger, x-circle), On order (info), Reserved (primary), In alteration, On rent, Damaged (neutral/danger), Service = "No stock" (neutral). |
| Tables | Desktop ≥ 768px: table with sticky header; mobile: stacked cards. Numbers right-aligned, tabular. |
| Empty states | Icon + one-line why + primary action + secondary (e.g. Import). |
| Drawers/sheets | Right sheet on desktop, bottom sheet on mobile; 50% black scrim; Esc + close button; focus trapped. |
| Toasts / inline success | `aria-live="polite"`, auto-hide 4s for toasts; inline success banners stay. |
| Icons | Lucide only, stroke 2, 16/20/24px. |

## 5. Layout
- Breakpoints 375 / 768 / 1024 / 1440. Sidebar ≥ 1024px, drawer below.
- Page gutter 12px (mobile) → 16px; card padding 20px → 24px.
- Max content width: none for app (data screens use space); 1152px for marketing.
- `min-h-dvh`, no horizontal scroll at 375px.

## 6. Accessibility
- Skip link to `#main`; visible `focus-visible` ring (2px primary + offset) on every interactive element.
- Icon-only buttons have `aria-label`; headings sequential (one h1 per page).
- Respect reduced motion; zoom never disabled.

## Pre-delivery checklist
- [ ] No emoji icons; Lucide only
- [ ] Tokens only, no raw hex in components (theme swatches excepted)
- [ ] cursor-pointer + pressed feedback on clickables
- [ ] Targets ≥ 44px; 8px spacing between targets
- [ ] Labels, helper text, errors near fields; loading state on submit
- [ ] Light + dark checked; text ≥ 4.5:1
- [ ] 375 / 768 / 1024 / 1440 verified; no horizontal scroll
- [ ] Focus visible; skip link; reduced motion respected
- [ ] Status never colour-only
