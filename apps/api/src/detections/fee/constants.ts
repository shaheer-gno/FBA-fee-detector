/** Shared fee-domain string sets — keep in sync with Postgres CHECK constraints. */

export const FEE_CATEGORIES = ['general', 'apparel', 'dangerous_goods'] as const;
export type FeeCategory = (typeof FEE_CATEGORIES)[number];

export const SEASONS = ['non_peak', 'peak'] as const;
export type Season = (typeof SEASONS)[number];

export const PRICE_BANDS = ['under_10', 'from_10_to_50', 'over_50'] as const;
export type PriceBand = (typeof PRICE_BANDS)[number];

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
export type SizeTier = (typeof SIZE_TIERS)[number];

export const VERDICTS = ['correct', 'overcharged', 'undercharged'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const SHIPPING_WEIGHT_MODES = ['unit_only', 'max_unit_dim'] as const;
export type ShippingWeightMode = (typeof SHIPPING_WEIGHT_MODES)[number];

export const DETECTION_SOURCES = ['manual', 'product', 'daily_job'] as const;
export type DetectionSource = (typeof DETECTION_SOURCES)[number];

/** Fixed UUID for the seeded US 2026 rate card (stable across resets). */
export const US_2026_RATE_CARD_ID = 'a1000000-0000-4000-8000-000000000001';

/** Price-band cutoffs (not stored in DB — plan option 6 deferred). */
export const PRICE_BAND_UNDER_MAX = 10;
export const PRICE_BAND_MID_MAX = 50;
