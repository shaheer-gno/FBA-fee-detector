# Fee rate settings in DB (approved plan)

Move 2026 US FBA rate data out of hardcoded TypeScript into Postgres.  
**Algorithms stay in code**; **numbers and tier limits become data**.

Status: **implemented** (seed via `FeeSettingsService` on API boot; no admin UI).  
Related: [FEE_MATH.md](./FEE_MATH.md), [ARCHITECTURE.md](./ARCHITECTURE.md).


---

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Price-band cutoffs table (`fee_price_band_rule`) | **Out** — keep `<$10` / `$10–$50` / `>$50` as code constants |
| Admin UI | **Out for now** — seed via migration / SQL only |
| Versioning | **Date-ranged** `fee_rate_card` (`effective_from` / `effective_to`) |
| Size-tier limits | **In DB** (`fee_size_tier_rule`) on day 1 |
| Detection audit | Store **`rate_card_id`** on `detections` (nullable, then backfill) |
| Loose strings | Shared TS **const arrays + types**; Postgres `CHECK` with the same values |

---

## DB vs code

| In DB | In code |
|-------|---------|
| Rate card versions + effective dates | Dim weight ÷139, 2″ floor application |
| Season windows (peak / non-peak dates) | First-fit loop order (driven by `sort_order` from DB) |
| Size-tier dim/weight/girth limits | `max(unit, dim)` vs unit-only (from `shipping_weight_mode` on rule) |
| Fixed fee bands | `lookupFixed` / `applyFormula` / reverse-match |
| Formula band params (base, afterLb, …) | Price-band cutoffs (constants) |
| Seed of current 2026 PDF rates | Verdict tolerance ($0.01) |

---

## Enums / constants

Single source in app, e.g. `apps/api/src/detections/fee/constants.ts`:

```ts
export const FEE_CATEGORIES = ['general', 'apparel', 'dangerous_goods'] as const;
export const SEASONS = ['non_peak', 'peak'] as const;
export const PRICE_BANDS = ['under_10', 'from_10_to_50', 'over_50'] as const;
export const SIZE_TIERS = [
  'small_standard',
  'large_standard',
  'small_bulky',
  'large_bulky',
  'extra_large_0_50',
  'extra_large_50_70',
  'extra_large_70_150',
  'extra_large_150_plus',
] as const;
export const SHIPPING_WEIGHT_MODES = ['unit_only', 'max_unit_dim'] as const;
```

Types: `export type FeeCategory = (typeof FEE_CATEGORIES)[number]`.  
DTOs: `@IsIn([...FEE_CATEGORIES])`.  
Postgres: `CHECK (category IN (...))` matching the same strings.

---

## Tables

### `fee_rate_card`

Published schedule (e.g. US FBA 2026).

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `marketplace` | text, default `'US'` |
| `name` | text, e.g. `'US FBA 2026'` |
| `effective_from` | date NOT NULL |
| `effective_to` | date NULL (open-ended) |
| `source_note` | text — PDF / Seller Central help ID |
| `is_active` | boolean — convenience flag for “current” card |
| `created_at` | timestamptz |

Resolve card for a `fee_date`:  
`effective_from ≤ fee_date` AND (`effective_to` IS NULL OR `fee_date ≤ effective_to`), prefer `is_active` / latest `effective_from`.

### `fee_season_window`

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `rate_card_id` | FK → `fee_rate_card` |
| `season` | `non_peak` \| `peak` |
| `start_date` | date |
| `end_date` | date |

Example peak: 2026-10-15 → 2027-01-14.

### `fee_size_tier_rule`

First-fit limits; engine sorts by `sort_order`.

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `rate_card_id` | FK |
| `size_tier` | SizeTier enum string |
| `sort_order` | int — 1 = try first |
| `max_longest_in` | numeric NULL if N/A |
| `max_median_in` | numeric NULL |
| `max_shortest_in` | numeric NULL |
| `max_unit_weight_oz` | numeric NULL — small standard |
| `max_shipping_weight_lb` | numeric NULL |
| `max_length_plus_girth_in` | numeric NULL — bulky |
| `shipping_weight_mode` | `unit_only` \| `max_unit_dim` |
| `dim_weight_min_two_in` | boolean — bulky/XL |

### `fee_fixed_band`

Menu rows (small standard; large standard ≤ 3 lb).

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `rate_card_id` | FK |
| `category` | FeeCategory |
| `season` | Season |
| `size_tier` | typically `small_standard` or `large_standard` |
| `max_oz` | numeric |
| `label` | text |
| `fee_under_10` | numeric |
| `fee_10_to_50` | numeric |
| `fee_over_50` | numeric |

### `fee_formula_band`

Base + increments (large standard &gt; 3 lb, bulky, XL).

| Column | Notes |
|--------|--------|
| `id` | uuid PK |
| `rate_card_id` | FK |
| `category` | FeeCategory |
| `season` | Season |
| `size_tier` | SizeTier (or a dedicated key if large_standard over-3 shares tier name — disambiguate via presence of formula row + shipping weight &gt; 3 in engine) |
| `label` | text |
| `base_under_10` | numeric |
| `base_10_to_50` | numeric |
| `base_over_50` | numeric |
| `after_lb` | numeric |
| `increment_lb` | numeric |
| `per_increment` | numeric |

**Note:** Large standard uses fixed bands when ship ≤ 3 lb and formula when ship &gt; 3 lb. Engine rule stays: try fixed first if ship ≤ 3; else formula for that tier. No separate size_tier string required for “over 3”.

### `detections.rate_card_id`

| Change | Notes |
|--------|--------|
| Add nullable `rate_card_id uuid REFERENCES fee_rate_card(id)` | Set on each new analysis; optional backfill |

---

## ER

```text
fee_rate_card
  ├── fee_season_window
  ├── fee_size_tier_rule
  ├── fee_fixed_band
  └── fee_formula_band

detections.rate_card_id → fee_rate_card.id
```

---

## Seeding (no admin UI)

1. Migration creates empty tables + CHECKs.  
2. Seed migration (or `supabase/seed` SQL) inserts one `fee_rate_card` for US 2026 and copies current values from `rate-cards.ts` / `size-tier.ts` / peak window.  
3. Parity tests: same inputs as existing Jest fee tests → same expected fees.  
4. After green: remove hardcoded tables from TS; load via repository (cache in memory after first read / on module init).

Updates later: new seed or SQL insert for a new `fee_rate_card` with new `effective_from`; old card gets `effective_to`.

---

## Implementation order

1. ~~`fee/constants.ts` + wire DTOs / types~~  
2. ~~SQL migrations (tables + `detections.rate_card_id`)~~  
3. ~~Seed 2026 data~~ (`FeeSettingsService` + `buildUs2026Snapshot` from `rate-cards.legacy-data.ts`)  
4. ~~`FeeSettingsRepository` / `FeeSettingsService`~~  
5. ~~Wire season / size-tier / lookup / analyze to snapshot~~  
6. ~~Persist `rate_card_id` on detections~~  
7. Legacy TS tables kept only as seed source (`rate-cards.legacy-data.ts`); runtime engine uses DB snapshot  

---

## Out of scope (this plan)

- Admin UI for editing rates  
- `fee_price_band_rule` table  
- SP-API charged-fee ingest  
- Multi-marketplace beyond a `marketplace` column placeholder  
