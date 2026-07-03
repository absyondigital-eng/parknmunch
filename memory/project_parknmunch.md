---
name: Park N Munch Website Build
description: Full live production stack for Park N Munch (Salford takeaway) — website, Supabase DB, Stripe checkout, admin panel, Android USB printer app
metadata:
  type: project
---

**This site is LIVE in production.** Real customers order and pay real money through it. Treat all changes with production care — no experimenting directly against prod data/config without a clear rollback plan.

## Architecture (as of 2026-07-02)

Menu is **not hardcoded** in the frontend anymore. `js/menu-data.js` only holds static config (CATEGORIES tabs, VIRTUAL_CATS, BURGER_ADDONS, MEAL_DRINKS, MEAL_UPGRADE_PRICE). The actual `MENU` array is fetched at runtime from the Supabase `products` table by `js/supabase-menu.js`, with a realtime subscription that pushes changes to the live customer page instantly — **no redeploy needed to add/edit/hide a product.**

Components:
- **Customer site**: `index.html` (marketing, no hardcoded menu), `order.html` + `js/order.js` (cart, modals, checkout) — plain JS, Supabase JS client loaded via CDN, Tailwind CDN.
- **Supabase** (`wexceoypjfliwdbxywzb.supabase.co`): `products` table (id uuid, name, slug, category, description, price, image_url, emoji, active, featured, popular, popular_order, sort_order, modifiers jsonb) — RLS: anon can read `active=true` only; authenticated (admin) full access. `orders` table stores completed orders (order_items jsonb, customer info, discount fields, order_status). `discount_codes` table for promo codes. Realtime enabled on `products`.
- **Admin panel** (`admin/`, React + Vite + Tailwind, separate Netlify site): full menu CRUD at `admin/src/components/menu/MenuPage.jsx` + `ProductEditModal.jsx` writing directly to Supabase via the JS client (`admin/src/hooks/useProducts.js`). **The Add/Edit Product form only exposes: name, category, price, description, active, popular, hasStyle toggle.** It does NOT expose image_url, emoji, slug, sort_order, hasDrinkChoice, or isGarage — those need a direct Supabase table edit/SQL if required.
- **Stripe**: `netlify/functions/create-checkout-session.js` builds Stripe Checkout line items dynamically via `price_data` (name/price/qty from the cart) — **no pre-registered Stripe Products/Prices exist or are needed.** Adding menu items never touches the Stripe dashboard. `stripe-webhook.js` handles `checkout.session.completed`, parses cart from session metadata (item list JSON is truncated to ~490 chars — long carts lose item detail in metadata, but order total/customer info is unaffected), inserts into `orders`. `stripe-refund.js` issues partial/full refunds via the stored `stripe_session_id`.
- **Printer app** (`ParkNMunchPrinter/`, Android/Kotlin, USB ESC/POS to Epson printer): fully generic — reads whatever's in `order_items` JSON and formats a receipt (`EscPosReceiptPrinter.kt`). `admin/src/lib/printReceipt.js` calls `window.AndroidPrint.printReceipt(...)` when running inside the app's WebView, else falls back to a browser print window. **Zero product-specific logic — never needs changes when the menu changes.**

## Product "personality" via category + modifiers (drives which modal opens in order.js)
- `category: 'burgers'` → burger modal (style Normal/Spicy if `modifiers.hasStyle`, BURGER_ADDONS checkboxes, optional meal-upgrade + drink pick)
- `category: 'box-deals'` → munchbox modal (addons only), unless `modifiers.isGarage: true` → "My Garage" modal (pick exactly 3 burgers, each with own style)
- `modifiers.hasDrinkChoice: true` (used on Cans) → simple single-drink-choice modal
- everything else → straight add-to-cart, no modal
- Tabs are virtual: the "Munchboxes" tab shows `box-deals` category, "Fuel Station" tab shows `milkshakes` category (see `VIRTUAL_CATS` in menu-data.js)

## "Box Builder" customisation (added 2026-07-02 for The Dealer's Box / X5 - Munch Box for 2)
A third burger-selection modal type, alongside the older "My Garage" (`isGarage`, fixed pick-3, style only, no add-ons). Box Builder is generalized: `modifiers.isBoxBuilder: true`, `modifiers.boxBuilderCount: N` (how many burgers), `modifiers.boxBuilderDrink: true|false` (whether a drink picker is included). Lets the customer pick N burgers (any mix/repeats), each with its own style (Normal/Spicy) and BURGER_ADDONS add-ons, plus an optional drink choice. Implemented in `js/order.js` (`openBoxBuilderModal`/`renderBoxBuilderBody`, cart key/price/name builders all branch on `customisation.boxBuilder`) and `order.html`'s `#boxBuilderOverlay` (reuses Garage's `.gm-*` card CSS + burger modal's `.bm-addon-row`/`.bm-drinks-wrap` CSS — no new modal CSS needed beyond a small `.gm-card-addons` spacing wrapper).

**Critical constraint discovered:** the Android printer (`EscPosReceiptPrinter.kt`) finds the *trailing* `(...)` block in the Stripe line-item name via regex and explodes it into "+ " bullet lines split on `" · "` then `", "` — but if anything inside contains its own parentheses (e.g. the burger modal's "Dipped (Spicy)" style value), the regex mis-matches and the *entire* name gets shoved into the single truncatable receipt row, silently losing detail. Box Builder deliberately uses Garage's plain "Normal"/"Spicy" style values (no parens) and joins each burger's style+addons with `+` as plain text (no commas) specifically to avoid retriggering this. Any future customisation type must keep the same constraint: no parens/commas inside the value put into a Stripe line-item name, and prefer one `" · "`-separated part per logical group so each becomes its own non-truncated receipt line.

**Did NOT touch:** the existing "My Garage" cartKey has a latent bug (`makeCartKey` doesn't account for `.garage`, so two differently-configured My Garage cart entries silently merge/overwrite each other) — left alone since it predates this session and wasn't in scope; Box Builder's own cartKey correctly encodes full selection state so it doesn't share this bug.

## Tablet admin app = same web admin, not a separate codebase
`ParkNMunchPrinter/app/src/main/java/com/parknmunch/printer/MainActivity.kt` loads `webView.loadUrl("https://admin47.netlify.app")` — the exact same site built from `admin/`. The Android project only adds a native `AndroidPrint` JS bridge (`PrintBridge.kt` → `EscPosReceiptPrinter.kt`) for USB receipt printing on top of that WebView. **There is no separate admin UI to maintain for the tablet** — any change to `admin/src/**` and a redeploy of the Netlify admin site automatically shows up on the tablet next time it loads/refreshes. The `ParkNMunchPrinter` Android project only needs its own rebuild if the printing logic, the USB bridge, or the hardcoded admin URL itself changes.

## How to add a new product safely
1. Prefer the **live Admin panel's Add Product UI** — no deploy, no code touched, works within existing categories/hasStyle modifier.
2. If the product needs `hasDrinkChoice`, `isGarage`, a specific `image_url`/`emoji`/`sort_order`, or a brand-new category, those require either a direct Supabase Studio table edit/SQL insert, or (for a new category) code changes in: `js/menu-data.js` (CATEGORIES tab list), `js/supabase-menu.js` (CATEGORY_ORDER), `admin/src/components/menu/ProductEditModal.jsx` (CATEGORY_OPTIONS), `admin/src/components/menu/MenuPage.jsx` (CATEGORY_CONFIG/CATEGORY_SORT_ORDER), `admin/src/hooks/useProducts.js` (ADMIN_CATEGORY_ORDER) — a real code change + redeploy.
3. Images go in `images/` in the project root, referenced by relative path in `image_url` (e.g. `images/new-item-image.jpeg`); if left blank the UI falls back to the `emoji` field.
4. No Stripe dashboard work, no printer app work, no schema migration needed for a normal product add.

**Why this matters:** the system was clearly designed so routine menu changes are a data-only operation (admin panel or SQL insert), not a code deploy — keep it that way unless the new items genuinely need new customisation UX.

Related: [[parknmunch-feedback]] (create if user gives workflow preferences during the 2-product addition task).
