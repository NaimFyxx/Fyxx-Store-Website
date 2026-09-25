# FYXX CUSTOM — theme customization inventory

**Purpose:** the checklist to re-apply every Fyxx customization after a forced Expanse
theme update. Base theme: **Expanse (Archetype)**, currently **9.1.0**.

At update time, the reliable method is a **file-by-file diff** of a clean copy of the new
Expanse version against our live theme (see [Migration process](#migration-process) at the
bottom). This document is the human-readable map of what to expect and what must not be
missed — especially the **modified stock files**, which an update overwrites.

> Convention: every Fyxx change in the code carries a `FYXX CUSTOM` comment. Grep the repo
> for `FYXX CUSTOM` to locate them. Files whose **name** starts with `fyxx-`, `tgr-`, or
> `custom.` are Fyxx-authored.

_Last audited: 2026-09-25._

---

## 0. Provenance / timeline

The first customizations recorded in this collaboration (Naím + Claude Code) date to
**28 Jun 2026** — that's the start of the "Website Updates & Improvements" changelog. The dated
record of everything built **from 28 Jun 2026 onward** lives in that changelog (see `CLAUDE.md`).

Everything below in this doc is the file map regardless of who authored it. The items in this
section pre-date the collaboration; exact dates and authors aren't recorded, so they're grouped
as **"before 28 Jun 2026."**

### Before 28 Jun 2026 — pre-existing customizations (earlier Fyxx team)
Built before this collaboration by the earlier Fyxx team / previous developers. Attribution is
mostly unknown; where known it's noted.

| Customization | Files | Note |
|---|---|---|
| **The Green Room page** | `templates/page.the-green-room.json` | Built by **Lori** (per Naím). |
| Custom navigation & floating header | `sections/fyxx-header.liquid`, `snippets/custom.secondary-menu-header.liquid`, `snippets/section.header.liquid` (edit) | Brand header, two-level nav, slide-in drawer, quick links. |
| Slide-in cart drawer | `sections/fyxx-cart-drawer.liquid` | Replaces the default cart. |
| Out-of-stock hiding on grids | `snippets/section.main-collection.liquid`, `snippets/section.featured-collection.liquid` (edits) | `oos-hidden` tag filtering. (Search-suggestion filtering was refined with Claude, Jun 2026.) |
| Predictive-search scroll containment | `snippets/form.predictive-search.liquid` (edit) | |
| Safari variant-picker fix | `snippets/block.product-variant-picker.button.liquid` (edit) | |
| App-download prompts | `layout/theme.liquid` (edit) | Apple Smart App Banner + Android "Download the App" floater. |
| SEO metas, domain verification, Microsoft Clarity | `layout/theme.liquid` (edit) | "Carried from previous theme." |
| Brand typography (Dunbar Text) | theme assets/settings | |
| Rewards page | `templates/page.fyxx-rewards.json` | (The `?r=` reward deep-link was added later with Claude — Aug 2026.) |
| Klaviyo birthday-flow pages | `sections/birthday-gift.liquid`, `templates/page.birthday-gift.json` | Live Klaviyo flow; display later corrected with Claude (Sep 2026). |
| Loyalty points-earned display on product pages | LoyaltyLion widget / theme markup on the product template | Built by Naím's brother. Being redesigned with Claude (Sep 2026). |
| Third-party app templates & integrations | see §3 "classify" list and §4 app embeds | Shogun, Fordeer, events, Judge.me, LoyaltyLion, Klaviyo, Smile/rewards, Odoo, gift/upsell/preorder apps, etc. |

> These dates are approximate. The intent is the ordering (pre-collaboration vs. from 28 Jun 2026),
> not exact history. If we learn a real date/author for any item, update the row.

---

## 1. New custom files — copy over wholesale

These files do not exist in stock Expanse. On migration, copy them into the new theme as-is
(then sanity-check that any theme objects/filters they use still exist in the new version).

### Sections (`sections/`)
| File | What it is |
|---|---|
| `fyxx-header.liquid` | Custom floating storefront header (brand logo, quick links, search/account/cart). |
| `fyxx-cart-drawer.liquid` | Slide-in cart drawer that replaces the default cart. |
| `fyxx-kitchen-hours.liquid` | Kitchen-availability gating — disables Add to Cart + shows a note outside opening hours (Green Room food / cheese / pizza), Asia/Amman time. **Wired into `templates/product.json` and `templates/product.tgr-menu.json`.** |
| `fyxx-reward-deeplink.liquid` | `?r=<LoyaltyLion reward id>` deep-link on the rewards page + return-to-rewards after login/join. |
| `fyxx-delivery-apps.liquid` | "See Today's Offers" Talabat/Careem band. **Built, but currently not in any template's order** (superseded by the in-buy-area buttons on tgr-menu). Kept for reuse. |
| `fyxx-free-delivery-bar.liquid` | Cart-page wrapper for the free-delivery bar snippet (renders + refreshes it). Wired into `templates/cart.json`. |
| `tgr-delivery-links.liquid` | The Green Room delivery handoff section for `/pages/tgr-food-delivery` (Talabat/Careem + delivery-click tracking). |
| `tgr-menu-section.liquid` | Renders the TGR food menu (category headings `.section-title`, menu items). |
| `tgr-cocktail-menu-section.liquid` | Renders the TGR cocktail menu. |
| `bar-catering.liquid` | Fyxx Bar Service landing (`/pages/bar-catering`) — hero, service pillars, quote form. |
| `bar-catering-terms.liquid` | Bar Service terms page (`/pages/bar-catering-terms`) — renders `page.content`. |
| `birthday-gift.liquid` | Klaviyo birthday-flow landing (`/pages/birthday-gift-unlocked`). |

### Layout (`layout/`)
| File | What it is |
|---|---|
| `tgr-delivery.liquid` | Minimal layout used only by the TGR delivery handoff page. |

### Snippets (`snippets/`)
| File | What it is |
|---|---|
| `custom.secondary-menu-header.liquid` | Quick-links secondary nav + slim desktop menu. Rendered by the modified `section.header.liquid` (see §2). |
| `custom.product-available-in-shop.liquid` | "Available in shop" label for products in stock in-store but not online. |
| `fyxx-free-delivery-bar.liquid` | Free-delivery progress bar + "Top Up" upsell. Rendered in the cart drawer and by `sections/fyxx-free-delivery-bar.liquid` on the cart page. Reads the `top-up` collection + theme settings `fyxx_freedel_enabled` / `fyxx_freedel_threshold`. |

### Assets (`assets/`)
| File | What it is |
|---|---|
| `icon.custom.svg` | Custom icon asset. |

---

## 2. Modified STOCK files — re-apply the edits (⚠ highest risk)

These are **standard Expanse files that were edited**. A theme update **overwrites them and
silently drops our edits** — this is the category that got missed last time. In each, find the
`FYXX CUSTOM … / END FYXX CUSTOM` block(s) and port them into the new version's copy of the
same file.

| File | FYXX CUSTOM edit(s) |
|---|---|
| `layout/theme.liquid` | (a) SEO metas — domain-verification + keywords + robots (carried from previous theme); (b) Apple Smart App Banner; (c) Microsoft Clarity analytics. |
| `snippets/section.header.liquid` | Renders the inline quick-links secondary nav / slim desktop menu (`custom.secondary-menu-header`). |
| `snippets/section.footer.liquid` | (a) Bilingual legal entity line (English + Arabic, `dir="rtl"`) + registered address; (b) mobile centering + Arabic RTL isolation. |
| `snippets/section.main-account.liquid` | Odoo Connector (Webkul) invoice-download column in order history. |
| `snippets/section.main-collection.liquid` | Hide products tagged `oos-hidden` from the collection grid. |
| `snippets/section.search-results.liquid` | Hide `oos-hidden` products from the predictive-search suggestions dropdown (still shown on full results). |
| `snippets/section.featured-collection.liquid` | Hide `oos-hidden` products from featured-collection grids. |
| `snippets/section.slideshow.liquid` | Per-slide "Open link in a new tab" toggle (`block.settings.open_new_tab`). |
| `snippets/form.predictive-search.liquid` | Stop the results-panel scroll from chaining into the page. |
| `snippets/block.product-variant-picker.button.liquid` | Safari variant-picker fix. |
| `sections/footer-group.json` | App Download banner intentionally hidden on TGR templates (embedded `custom_liquid` block keyed on template suffix `tgr-menu` / `tgr-cocktails` / `tgr-cocktail`). |
| `sections/fyxx-cart-drawer.liquid` | (Custom section, §1.) Also renders the free-delivery bar + Top Up add handler. |
| `templates/cart.json` | Adds the `fyxx-free-delivery-bar` section above `main-cart`. |
| `config/settings_schema.json` | Adds the "Fyxx — Free delivery" settings group (`fyxx_freedel_enabled`, `fyxx_freedel_threshold`). |

---

## 3. Custom templates — recreate / copy

Fyxx-authored page & product templates. Copy the JSON/Liquid over; after update, confirm the
section **types and block schemas they reference still exist** in the new Expanse version.

### Confirmed Fyxx templates
| Template | Notes |
|---|---|
| `templates/product.tgr-menu.json` | TGR food product template. Custom `main` blocks: `custom_dish_category` (dish label), purchase blocks (`price`/`quantity_selector`/`buy_buttons` with pickup **off**), `custom_delivery_offers` (Talabat/Careem buttons + full click tracking), `custom_GWyMDK` (Book a Table), `custom_bg_block` (cream bg); `custom_css` for title/description styling. Order includes the `fyxx-kitchen-hours` section. |
| `templates/product.tgr-cocktail.json` | TGR cocktail product template (mirrors several tgr-menu blocks). |
| `templates/product.json` | **Default product template, MODIFIED** — its order includes the `fyxx-kitchen-hours` section. (Re-add after update.) |
| `templates/page.tgr-menu.json` | TGR menu page (App Download banner hidden via footer-group). |
| `templates/page.tgr-cocktails.json` | TGR cocktails page (App Download banner hidden). |
| `templates/page.tgr-food-delivery.liquid` | Delivery handoff page — uses `layout 'tgr-delivery'` + `tgr-delivery-links` section. |
| `templates/page.bar-catering.json` | Bar Service landing. |
| `templates/page.bar-catering-terms.json` | Bar Service terms. |
| `templates/page.birthday-gift.json` | Birthday landing. |
| `templates/page.cup-landing.liquid` | Fyxx Cup 2026 landing microsite. |
| `templates/page.cup-redirect.liquid` | Fyxx Cup instant-redirect variant. |
| `templates/page.fyxx-rewards.json` | Rewards page (uses `fyxx-reward-deeplink`). |
| `templates/page.fyxx-liquor-store.json` | Fyxx liquor-store page. |
| `templates/page.the-green-room.json` | The Green Room page. |

### Templates to CLASSIFY at migration (mix of Fyxx-custom and app-generated)
Verify each before porting — some are owned by installed apps (Shogun, Fordeer, an events app,
gift/upsell apps) and are re-created by the app rather than ported by hand:
`article.shogun.custom.liquid`, `collection.shogun.custom.liquid`, `page.shogun.default.liquid`,
`page.shogun.landing.liquid`, `product.shogun.custom.liquid`, `search.fordeer.productsresult.liquid`,
`collection.event-calendar.json`, `collection.event-listing.json`, `collection.vendor-ajax.liquid`,
`collection.no-sidebar.json`, `collection.no-promos.json`, `collection.collection-landing.json`,
`product.cross-selling.json`, `product.free-gift.json`, `product.preorder.json`, `product.brand-story.json`,
`product.arak-product-detail-page.json`, `product.beer-59.json`, `product.beer-absolut.json`,
`product.high-variant.json`, `product.product-landing.json`, `product.events.json`, `product.form.json`,
`product.no-gift-option.json`, `page.custom.christmas.json`, `page.activations.json`,
`search.recently-viewed.liquid`.

---

## 4. App layer (auto-managed — usually survives an update)

App **theme-app-embed** blocks live in `config/settings_data.json` under `current.blocks` and
re-attach after a theme update (they are not theme files). Verify they're still enabled
post-update rather than re-authoring them. Currently enabled:

SEO Manager (venntov, `seomanager` + `seomanager-404`), Klaviyo, Microsoft Clarity, LoyaltyLion,
Triple Whale, Judge.me, Reorder Master, Helium Customer Fields, Yagi Order Cancellable, StockIQ,
Sami Product Labels, Automatic Discounts/Upsells, EG Auto Add to Cart, Super Gift Options,
LDT Gift Wrap, Instafeed, Frequently Bought, PAL, llea-ai, Forms.

`tgr-delivery-links` is also referenced from `settings_data.json` (the delivery page instance).

---

## 5. NOT theme code — no port needed

These live in Shopify Admin / the catalogue and are unaffected by theme updates. Listed so
they're not confused for theme work:
- Product **SEO title/description** and body-copy edits (wine serving-temperature normalization
  across 445 products; cheese-platter hours copy; Bar Service page content).
- **Product handles** (31 Green Room food items re-handled) and the theme settings that
  reference them by handle — those handle references live in the custom templates in §3.
- The "Website Updates & Improvements" **changelog** (Claude Artifact; see `CLAUDE.md`).

---

## Migration process

1. **Add a clean copy of the new Expanse version** as an unpublished/draft theme (do not
   publish it).
2. **Diff** the clean theme against our live theme file-by-file (read the clean theme's files
   via the Shopify theme API). The diff is the source of truth.
3. **Copy §1 files wholesale** into the new theme.
4. **Re-apply §2 edits** — for each modified stock file, port its `FYXX CUSTOM` block(s) into
   the new version's copy of that same file (do not blindly overwrite the whole file — the new
   version may have its own changes).
5. **Recreate §3 templates**; confirm referenced section/block schemas exist in the new version.
6. **Verify §4 app embeds** are still enabled.
7. **Re-test** the customer-facing customizations: kitchen-hours gating (`?kh=closed`/`?kh=open`),
   TGR delivery buttons + tracking, the cart drawer, the header quick-links nav, the footer
   (Arabic line + mobile centering), SEO metas + Clarity, and `oos-hidden` filtering on
   collections/search.
8. Update the changelog per `CLAUDE.md`.
