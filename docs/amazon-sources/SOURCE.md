# Amazon source documents (US FBA)

Canonical Seller Central help exports used for this app’s calculations.

| File | Topic | Seller Central help ID |
|---|---|---|
| `Fee Changes.pdf` | 2026 US FBA fulfillment fee rate cards (general / apparel / dangerous goods; **non-peak + peak**) | GABBX6GZPA8MSZGW |
| `Shipping Weight.pdf` | How shipping weight is chosen (unit vs dimensional) | GEVWP48HPBLEFJEY |
| `Size Tiers.pdf` | 2026 product size tier dimension/weight limits (from Jan 15, 2026) | GG5KW835AHDJCH8W |

Exported from Seller Central Help on **2026-10-20**.

## Peak vs non-peak (from Fee Changes.pdf)

- **Non-peak:** Jan 15 – Oct 14, 2026 — normal fulfillment fee tables  
- **Peak (holiday):** Oct 15, 2026 – Jan 14, 2027 — higher $ amounts, same size/weight bands  

The app infers season from `fee_date` (not a dropdown). That date must match which table Amazon used for the charged fee.

Full pipeline + reverse-match: [FEE_MATH.md](../FEE_MATH.md).

## Size tiers (2026, from Jan 15, 2026)

First tier whose **every** limit fits:

| Tier | Shipping weight¹ | Longest | Median | Shortest | Length + girth |
|---|---|---|---|---|---|
| Small standard | ≤16 oz | ≤15 in | ≤12 in | ≤0.75 in | — |
| Large standard | ≤20 lb | ≤18 in | ≤14 in | ≤8 in | — |
| Small bulky | ≤50 lb | ≤37 in | ≤28 in | ≤20 in | ≤130 in |
| Large bulky | ≤50 lb | ≤59 in | ≤33 in | ≤33 in | ≤130 in |
| Extra-large … | by weight band | exceeds large bulky limits **or** shipping weight > 50 lb | | | |

¹ For determining size tier, shipping weight = greater of unit or dimensional weight (see footnotes in Size Tiers.pdf).

## Shipping weight (for fees)

| Size tier | Shipping weight |
|---|---|
| Small standard | Unit weight only |
| Large standard | max(unit, dimensional) |
| Small / Large bulky | max(unit, dimensional) |
| Extra-large 0–150 lb | max(unit, dimensional) |
| Extra-large 150+ lb | Unit weight only |

## Dimensional weight (US)

`dimensional weight (lb) = (L × W × H) / 139`

For **small bulky, large bulky, and extra-large**, Amazon assumes a **minimum width and height of 2 inches**.  
Large standard does **not** use that 2 in floor (Fee Changes FAQ + Shipping Weight examples).

## Price bands (2026)

- Price **&lt; $10** → `&lt;$10`  
- Price **$10–$50 inclusive** → `$10–$50`  
- Price **&gt; $50** → `&gt;$50`  

## Out of scope (v1)

SIPP discounts, Overmax surcharge amounts, inbound placement, storage, low-inventory fees, fuel surcharge (3.5% from Apr 17, 2026).
