# Billing counter — overrides

- **Density: dense but touch-safe.** Cashiers repeat the same 5 actions all day; every control ≥ 44px, primary "Pay" ≥ 56px.
- **Layout ≥ 1024px:** two panes — left: search/scan + results; right (400–440px): cart, customer, totals, actions. Cart pane sticky to viewport height; only the line list scrolls.
- **< 1024px:** search + results full width; cart collapses to a fixed bottom bar (`n items · ₹total · Review`) that opens the cart as a full-height sheet. Bottom bar respects safe area.
- **Scanner first:** search input is focused on load and after every add; Enter on an exact barcode/SKU adds instantly with a short confirmation toast (`aria-live="polite"`).
- **Keyboard:** F2 search · F4 hold · F8 pay · Esc closes dialogs.
- **Totals:** tabular numbers, payable in 36px bold; tax breakup collapsed by default.
- **Dialogs:** native `<dialog>` (focus trap, Esc), bottom sheet on mobile, centred on desktop, 50% scrim.
- **Approval:** over-limit discounts and price changes open a manager PIN pad, never a silent failure.
- **Stock:** each result shows the stock pill; out-of-stock variants are visible but disabled (unless negative stock is allowed).
