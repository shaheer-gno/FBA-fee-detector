# FBA fee math (US 2026) — how this app calculates

This document explains the **forward** calculation (expected fee from seller dims) and **reverse-match** (what Amazon band the charged fee looks like). Implementation: `apps/api/src/detections/fee/`.

Canonical Amazon sources: [amazon-sources/SOURCE.md](./amazon-sources/SOURCE.md) + PDFs in that folder.

---

## Pipeline overview

```
seller dims + weight + category + selling price + fee_date + charged fee
        │
        ├─ seasonFromFeeDate(fee_date)     → peak | non_peak
        ├─ resolveSizeTier(dims, weight) → size tier + shipping weight
        ├─ lookupFulfillmentFee(...)     → expected $ from rate card
        ├─ compare charged vs expected   → verdict
        └─ findReverseMatch(charged)     → implied Amazon band (if mismatch)
```

Entry point: `analyzeOvercharge` in `fee/analyze.ts` (wrapped by `FeeCalculationService`).

Tolerance: **$0.01**. Difference = charged − expected.

| Verdict | When |
|---------|------|
| `correct` | \|diff\| ≤ $0.01 |
| `overcharged` | charged > expected + $0.01 |
| `undercharged` | charged < expected − $0.01 |

---

## 1. Season (peak vs non-peak)

`fee/season-from-date.ts`

- **Peak:** Oct 15 – Jan 14 (inclusive)
- **Non-peak:** Jan 15 – Oct 14

Same size/weight bands; **different dollar amounts** on the rate cards. Wrong season → wrong expected fee even with correct dims.

---

## 2. Sort sides & dimensional weight

`fee/dimensions.ts`

Sides are sorted: **longest ≥ median ≥ shortest**.

```
dimensional weight (lb) = (L × W × H) / 139
```

**2″ floor:** for small bulky / large bulky / extra-large only, the two *smaller* sides are floored at 2 in before the formula. Large standard uses **raw** dims (no floor).

`unit weight (lb) = unitWeightOz / 16`

Length + girth = `longest + 2 × (median + shortest)` (used for bulky limits).

---

## 3. Size tier (first fit)

`fee/size-tier.ts` — try tiers from smallest to largest; first tier where **all** limits pass wins.

| Order | Tier | Key limits (summary) |
|-------|------|----------------------|
| 1 | Small standard | longest ≤15, median ≤12, shortest ≤0.75, unit ≤16 oz |
| 2 | Large standard | ≤18 / ≤14 / ≤8 in, shipping wt ≤20 lb |
| 3 | Small bulky | ≤37 / ≤28 / ≤20, ship ≤50 lb, L+girth ≤130 |
| 4 | Large bulky | ≤59 / ≤33 / ≤33, ship ≤50 lb, L+girth ≤130 |
| 5 | Extra-large… | exceeds large bulky **or** ship > 50 lb; split by weight band |

**Shipping weight used for fees** (after tier is known):

| Tier | Shipping weight |
|------|-----------------|
| Small standard | **Unit only** |
| Large standard, small/large bulky, XL 0–150 | **max(unit, dimensional)** |
| Extra-large 150+ | **Unit only** |

For tier *eligibility*, large standard / bulky use the appropriate dim-weight variant (no 2″ floor for large-standard check; 2″ floor for bulky/XL).

---

## 4. Price band

`priceBandFromSellingPrice` in `fee/rate-cards.ts`

| Selling price | Band |
|---------------|------|
| &lt; $10 | `under_10` |
| $10 – $50 inclusive | `from_10_to_50` |
| &gt; $50 | `over_50` |

---

## 5. Category (three rate cards)

Same size-tier & shipping-weight math. **Different dollar tables:**

| `FeeCategory` | Use |
|---------------|-----|
| `general` | Most products |
| `apparel` | Clothing / apparel FBA table |
| `dangerous_goods` | Hazmat / DG table (typically higher) |

Wrong category on the product → wrong expected fee with correct dims.

---

## 6. Rate card lookup

`lookupFulfillmentFee` in `fee/rate-cards.ts`

Selects table by: **category × season × size tier**, then:

- **Fixed bands** (small standard, large standard ≤3 lb): first band where shipping weight oz ≤ `maxOz`, pick fee for price band.
- **Formula bands** (large standard &gt;3 lb, bulky, XL): base + `$perIncrement` × increments above a weight threshold.

Rates are stored in Postgres (`fee_rate_card` + bands) and loaded into a snapshot at API boot. Seed source for US 2026 remains `fee/rate-cards.legacy-data.ts` → `buildUs2026Snapshot()`. Algorithms stay in `fee/rate-cards.ts` / `size-tier.ts`.

Out of scope in v1: SIPP, fuel surcharge, storage, low-inventory, inbound placement.

---

## Worked example A — correct small standard

**Inputs** (matches unit test):

| Field | Value |
|-------|-------|
| L×W×H | 8 × 5 × 0.5 in |
| Unit weight | 10 oz |
| Category | general |
| Price | $25 |
| Fee date | 2026-06-01 → **non-peak** |
| Charged | $3.68 |

**Steps:**

1. Sides: 8 / 5 / 0.5 → fits **small standard** (shortest ≤ 0.75, unit ≤ 16 oz).
2. Shipping weight = **10 oz** (unit only).
3. Price band = `$10–$50`.
4. Rate card band “8+ to 10 oz” general non-peak → **$3.68**.
5. Charged $3.68 → verdict **`correct`**. Reverse-match **null** (no mismatch).

Code path: `resolveSizeTier` → `lookupFulfillmentFee` → `analyzeOvercharge`.

---

## Worked example B — overcharge + reverse-match

Same dims as A, but Amazon charged **$4.20**.

1. Expected still **$3.68** (small standard, 8–10 oz).
2. Diff = +$0.52 → **`overcharged`**.
3. Reverse-match: enumerate all fee samples for general + non-peak + $25 price band; find sample whose `$` is closest to **$4.20**.
4. Closest is a **large standard** weight band → `impliedSizeTier: large_standard`.
5. Explanation tells the seller: your dims say small standard; charged fee looks like large standard — likely Amazon’s stored measurement is wrong.

This is the core “wrong measurement” signal Bilal’s workflow cares about.

---

## Worked example C — peak season

Same dims as A, fee date **2026-11-01** → peak. Expected becomes **$3.89** (peak table, same band). Charging $3.68 on a peak day would show undercharged/incorrect vs peak table.

---

## Reverse-match — how it works

**Not** “re-measure Amazon’s package.” It answers:

> Given category, season, and selling price, which **size tier + weight band** on our rate card has a fee closest to what Amazon charged?

### Algorithm (`findReverseMatch` in `analyze.ts`)

1. If charged ≈ expected (within $0.01) → return **`null`** (nothing to imply).
2. Call `enumerateFeeSamples({ category, season, sellingPriceUsd })`:
   - Walks small-standard fixed bands, large-standard fixed bands, sampled over-3 lb large-standard weights, bulky/XL formula samples.
   - Each sample: `{ sizeTier, weightBandLabel, fee }`.
3. Pick the sample with **minimum** `|fee − chargedFeeUsd|`.
4. Return `{ impliedSizeTier, impliedWeightBandLabel, matchedFeeUsd, feeDeltaFromCharged }`.

### What it is good for

- Dispute narrative: “You charged like Large standard X oz; our proof says Small standard Y oz.”
- UI “Implied Amazon band” in detection details.

### Limits

- Closest-$ match can be ambiguous if two bands share similar fees.
- Does not prove Amazon’s dims; it **hints** which fee row was likely used.
- Samples formula tiers at discrete weights (not every ounce) — good enough for guidance, not forensic.
- Undercharges often skip useful reverse-match messaging (SIPP / Low Price / wrong season).

---

## Code map

| File | Responsibility |
|------|----------------|
| `fee/analyze.ts` | Orchestrate tier → fee → verdict → reverse-match → explanation |
| `fee/size-tier.ts` | First-fit size tier + shipping weight |
| `fee/dimensions.ts` | Sort sides, dim weight, girth |
| `fee/rate-cards.ts` | Lookup + enumerate against a rate-card snapshot |
| `fee/fee-settings.service.ts` | Load/seed/cache rate cards from DB |
| `fee/season-from-date.ts` | Peak window |
| `fee/fee-calculation.service.ts` | Nest injectable wrapping `analyzeOvercharge` |
| `fee/__tests__/…` | Examples A/B/C above |

Call chain in the app:

```
POST detect / analyze / run-daily
  → DetectionsService
  → FeeCalculationService.analyze
  → analyzeOvercharge
  → persist detection (snapshot + reverse_match columns)
```

---

## Related

- [ARCHITECTURE.md](./ARCHITECTURE.md) — product master + daily checks
- [API.md](./API.md) — HTTP contract
- [amazon-sources/SOURCE.md](./amazon-sources/SOURCE.md) — PDF provenance
