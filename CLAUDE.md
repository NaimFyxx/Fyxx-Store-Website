# Fyxx Store Website — working notes for Claude

## Always keep the changelog current

There is a living **"Website Updates & Improvements"** changelog published as a Claude Artifact.
The Fyxx team relies on it as the running record of what has shipped to the storefront.

- **Artifact URL:** https://claude.ai/code/artifact/d492a5a1-dd44-4eb4-a576-ff79235eac78
  (owned by the Fyxx account; favicon 🥂). If this URL is ever stale, find it with
  `Artifact` `action: "list"` — it is titled "Fyxx Website — Updates & Improvements".

**Whenever you ship a customer-facing change to this storefront, update the changelog before
ending the session.** "Shipped" means either:
- theme code merged/pushed such that it reaches the live theme (i.e. lands on `main`), **or**
- a live change made through the Shopify Admin API — pages, catalogue/product copy, SEO,
  metafields, collections, etc.

### How to update it
1. `Artifact` `action: "read"` with the URL above to get the current HTML.
2. Add a new **dated card, newest first**, in the existing format: pick the right tag
   (`t-new` New / `t-improved` Improved / `t-fixed` Fixed / `t-removed` Removed / `t-cup` Fyxx Cup),
   a short title, an `area` label, and a plain-language, customer-facing description.
3. Update the header **reporting-period** end date and the **footer** count + "Prepared" date.
4. Republish to the **same** `url` (pass `url:` so the link and 🥂 favicon are preserved).

### Rules
- **Only record what actually shipped.** Work still on a branch / in an open PR goes in the
  purple **"In review"** note near the bottom, not the dated timeline — move it up to a dated
  card once it merges.
- **Anchor dates to real evidence** — `git log` on `main`, or the date you made the live
  Admin-API change — never guess.
- Write for the store owner and their team, not in developer terms.

_Note: this file only takes effect once it is on the repository's default branch (`main`).
Sessions start fresh and nothing auto-triggers the update — this note is what makes it happen._
