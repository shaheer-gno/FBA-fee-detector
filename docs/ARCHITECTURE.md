# Architecture & decisions

US FBA Fee Overcharge Detector — product master + daily discrepancy checks.

## Problem (as clarified with Bilal)

- Seller sets **true package dimensions & weight once per SKU**.
- The tool runs an **active daily check** (not a historical date-range report).
- Compare expected FBA fulfillment fee (from seller dims + 2026 rate cards) to the fee Amazon is charging.
- Flag overcharges likely caused by wrong Amazon measurements.

## Domain facts

| Topic | Decision |
|-------|----------|
| Amazon fee charging | **Per unit shipped**, using size tier + shipping weight derived from the SKU’s **stored package dims/weight**. |
| Amazon measurements | Catalog dims/weight persist until remasured or corrected — wrong dims overcharge **every** unit. |
| Daily re-run same product | Math is idempotent if inputs unchanged. Value is catching **fee / measurement / season / price-band drift**, plus an audit trail. |
| `fee_date` | Calendar day the check applies to → infers peak (Oct 15–Jan 14) vs non-peak. **Not** a lookback range. |
| Users / multi-tenant | **Deferred.** Single-tenant MVP: `products` only. Add `users` / seller accounts when auth or multi-seller is required. |
| Charged fee source | **Manual for MVP** (per detect / daily batch). SP-API / Fee Preview later. |

## High-level flow

```
Product setup (once)
  SKU + true L/W/H + weight + category + selling price + charged FBA fee
        │
        ▼
Detect (manual or daily job)
  product dims (snapshot onto detection)
  + fee_date → season
  + charged_fee_usd (supplied)
        │
        ▼
FeeCalculationService → verdict
        │
        ▼
detections row (immutable snapshot + product_id)
```

### Run daily (current)

UI **Run daily** → `POST /api/detections/run-daily`:

1. Load **all** `products` with `active = true` (`listActive`, no pagination).
2. Resolve the **rate card once** for `feeDate` and reuse that snapshot for every SKU.
3. Per product: charged fee = optional body override, else `last_charged_fee_usd`; skip if missing.
4. Detect + save with `source = daily_job`.

Phased next steps (Temporal / Redis / SP-API): see project plan — not built yet.

## Stack

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm workspaces — `apps/api`, `apps/web` |
| API | NestJS 11 — controller → service → repository |
| Fee math | `FeeCalculationService` + DB-backed rate card ([RATE_SETTINGS.md](./RATE_SETTINGS.md)) |
| DB | Supabase Postgres + SQL migrations under `supabase/migrations/` (no TypeORM) |
| Persistence | `@supabase/supabase-js` with `service_role` (required). App refuses to start if env is missing or DB is unreachable |
| Web | React 19 + Vite + TanStack Router/Query |

## Data model

### `products`

Seller truth per SKU. Edited rarely; used as input for every detect.

- Identity: `sku` (unique), optional `asin`, `title`
- Package: `length_in`, `width_in`, `height_in`, `unit_weight_oz`
- Fee inputs: `category`, `selling_price_usd`, `last_charged_fee_usd` (manual until SP-API)
- `active` — included in daily run when true
- List API also attaches **`latestDetection`** (most recent run) for FBA status + View details UI

### `detections`

One row per analysis run. **Snapshots** dims/price used that day so history stays correct if the product is later edited.

- `product_id` — FK to `products` (null for one-off analyze)
- `run_date` / `fee_date` — usually the same calendar day
- `source` — `manual` \| `product` \| `daily_job`
- Full fee math + verdict + optional reverse-match columns
- History **Details** modal shows the full snapshot + explanation

## Modules (`apps/api`)

```
supabase/     Global SupabaseModule — required env + startup DB ping
products/     CRUD for product master
detections/   analyze (one-off), detect-from-product, run-daily, list
  fee/        size tier, shipping weight, rate cards, season-from-date
```

## Frontend (`apps/web`) — feature modules

Prefer **feature folders** over dumping pages/apis in one place. Each feature owns its HTTP, React Query hooks, and pages.

```
src/
  main.tsx                 # entry (providers)
  app/                     # shell + router only
  shared/                  # cross-cutting only
    api/client.ts          # fetch + pageQuery
    api/types.ts           # PageResult, AnalyzeResponse, FeeCategory
    lib/                   # dates, etc.
    ui/                    # Modal, Pagination, ResultCard
    styles.css
  modules/
    products/              # types, api, queries, components, pages
    history/               # types, api, queries, pages
    analyze/               # types, api, queries, pages
```

| Concern | Lives in |
|---------|----------|
| Product CRUD / detect / daily | `modules/products` |
| Detection history list + filter | `modules/history` |
| One-off analyze form | `modules/analyze` |
| Query keys + hooks | `*/queries.ts` (invalidate via `productsKeys` / `historyKeys`) |
| Shared fetch helper | `shared/api/client.ts` only |

Do **not** put feature endpoints back into a global `api.ts`. Cross-module reads (e.g. history product dropdown) import the other module’s query hook.

## Out of scope (MVP)

- Auth / users / RLS per seller
- Automatic Amazon fee ingest (SP-API)
- Cron scheduler (trigger via `POST /api/detections/run-daily` for now)
- Alert-only-on-verdict-change (can filter in UI later)

## Related docs

- [FEE_MATH.md](./FEE_MATH.md) — tiers, categories, rate lookup, reverse-match + examples
- [RATE_SETTINGS.md](./RATE_SETTINGS.md) — DB rate-card schema + seed on API boot
- [API.md](./API.md) — HTTP contract
- [amazon-sources/SOURCE.md](./amazon-sources/SOURCE.md) — Seller Central PDF provenance
