/** Seed-only 2026 fee tables — do not import from runtime engine paths except us-2026-snapshot. */
/**
 * 2026 US FBA fulfillment fees from docs/amazon-sources/Fee Changes.pdf
 * (Seller Central GABBX6GZPA8MSZGW). Fuel surcharge not included.
 * Non-peak: Jan 15 – Oct 14, 2026 | Peak: Oct 15, 2026 – Jan 14, 2027
 */
import type { FeeCategory, PriceBand, Season, SizeTier } from './constants';

export type FixedBand = {
  maxOz: number;
  label: string;
  under_10: number;
  from_10_to_50: number;
  over_50: number;
};

/** Incremental fee formulas for heavy / bulky tiers */
export type FormulaBand = {
  kind: 'large_standard_over_3lb' | 'bulky' | 'xl';
  label: string;
  /** base fees by price band */
  base: Record<PriceBand, number>;
  /** $ per increment */
  perIncrement: number;
  /** lbs above which increments start */
  afterLb: number;
  /** increment size in lb (0.25 = 4 oz, 0.5 = half-lb, 1 = per lb) */
  incrementLb: number;
};

export function priceBandFromSellingPrice(priceUsd: number): PriceBand {
  if (priceUsd < 10) return 'under_10';
  if (priceUsd <= 50) return 'from_10_to_50';
  return 'over_50';
}

function pick(
  band: FixedBand,
  priceBand: PriceBand,
): number {
  return band[priceBand];
}

/** 2026 US non-peak / peak rate cards (Seller Central–aligned public summaries). */
export const SMALL_STANDARD: Record<
  FeeCategory,
  Record<Season, FixedBand[]>
> = {
  general: {
    non_peak: [
      { maxOz: 2, label: '2 oz or less', under_10: 2.43, from_10_to_50: 3.32, over_50: 3.58 },
      { maxOz: 4, label: '2+ to 4 oz', under_10: 2.49, from_10_to_50: 3.42, over_50: 3.68 },
      { maxOz: 6, label: '4+ to 6 oz', under_10: 2.56, from_10_to_50: 3.45, over_50: 3.71 },
      { maxOz: 8, label: '6+ to 8 oz', under_10: 2.66, from_10_to_50: 3.54, over_50: 3.8 },
      { maxOz: 10, label: '8+ to 10 oz', under_10: 2.77, from_10_to_50: 3.68, over_50: 3.94 },
      { maxOz: 12, label: '10+ to 12 oz', under_10: 2.82, from_10_to_50: 3.78, over_50: 4.04 },
      { maxOz: 14, label: '12+ to 14 oz', under_10: 2.92, from_10_to_50: 3.91, over_50: 4.17 },
      { maxOz: 16, label: '14+ to 16 oz', under_10: 2.95, from_10_to_50: 3.96, over_50: 4.22 },
    ],
    peak: [
      { maxOz: 2, label: '2 oz or less', under_10: 2.62, from_10_to_50: 3.51, over_50: 3.77 },
      { maxOz: 4, label: '2+ to 4 oz', under_10: 2.68, from_10_to_50: 3.61, over_50: 3.87 },
      { maxOz: 6, label: '4+ to 6 oz', under_10: 2.76, from_10_to_50: 3.65, over_50: 3.91 },
      { maxOz: 8, label: '6+ to 8 oz', under_10: 2.86, from_10_to_50: 3.74, over_50: 4.0 },
      { maxOz: 10, label: '8+ to 10 oz', under_10: 2.98, from_10_to_50: 3.89, over_50: 4.15 },
      { maxOz: 12, label: '10+ to 12 oz', under_10: 3.03, from_10_to_50: 3.99, over_50: 4.25 },
      { maxOz: 14, label: '12+ to 14 oz', under_10: 3.14, from_10_to_50: 4.13, over_50: 4.39 },
      { maxOz: 16, label: '14+ to 16 oz', under_10: 3.17, from_10_to_50: 4.18, over_50: 4.44 },
    ],
  },
  apparel: {
    non_peak: [
      { maxOz: 2, label: '2 oz or less', under_10: 2.62, from_10_to_50: 3.51, over_50: 3.77 },
      { maxOz: 4, label: '2+ to 4 oz', under_10: 2.64, from_10_to_50: 3.54, over_50: 3.8 },
      { maxOz: 6, label: '4+ to 6 oz', under_10: 2.68, from_10_to_50: 3.59, over_50: 3.85 },
      { maxOz: 8, label: '6+ to 8 oz', under_10: 2.81, from_10_to_50: 3.69, over_50: 3.95 },
      { maxOz: 10, label: '8+ to 10 oz', under_10: 3.0, from_10_to_50: 3.91, over_50: 4.17 },
      { maxOz: 12, label: '10+ to 12 oz', under_10: 3.1, from_10_to_50: 4.09, over_50: 4.35 },
      { maxOz: 14, label: '12+ to 14 oz', under_10: 3.2, from_10_to_50: 4.2, over_50: 4.46 },
      { maxOz: 16, label: '14+ to 16 oz', under_10: 3.3, from_10_to_50: 4.25, over_50: 4.51 },
    ],
    peak: [
      { maxOz: 2, label: '2 oz or less', under_10: 2.85, from_10_to_50: 3.74, over_50: 4.0 },
      { maxOz: 4, label: '2+ to 4 oz', under_10: 2.87, from_10_to_50: 3.77, over_50: 4.03 },
      { maxOz: 6, label: '4+ to 6 oz', under_10: 2.93, from_10_to_50: 3.84, over_50: 4.1 },
      { maxOz: 8, label: '6+ to 8 oz', under_10: 3.06, from_10_to_50: 3.94, over_50: 4.2 },
      { maxOz: 10, label: '8+ to 10 oz', under_10: 3.27, from_10_to_50: 4.18, over_50: 4.44 },
      { maxOz: 12, label: '10+ to 12 oz', under_10: 3.37, from_10_to_50: 4.36, over_50: 4.62 },
      { maxOz: 14, label: '12+ to 14 oz', under_10: 3.49, from_10_to_50: 4.49, over_50: 4.75 },
      { maxOz: 16, label: '14+ to 16 oz', under_10: 3.59, from_10_to_50: 4.54, over_50: 4.8 },
    ],
  },
  dangerous_goods: {
    non_peak: [
      { maxOz: 2, label: '2 oz or less', under_10: 3.4, from_10_to_50: 4.29, over_50: 4.55 },
      { maxOz: 4, label: '2+ to 4 oz', under_10: 3.43, from_10_to_50: 4.36, over_50: 4.62 },
      { maxOz: 6, label: '4+ to 6 oz', under_10: 3.48, from_10_to_50: 4.37, over_50: 4.63 },
      { maxOz: 8, label: '6+ to 8 oz', under_10: 3.55, from_10_to_50: 4.43, over_50: 4.69 },
      { maxOz: 10, label: '8+ to 10 oz', under_10: 3.64, from_10_to_50: 4.55, over_50: 4.81 },
      { maxOz: 12, label: '10+ to 12 oz', under_10: 3.65, from_10_to_50: 4.61, over_50: 4.87 },
      { maxOz: 14, label: '12+ to 14 oz', under_10: 3.73, from_10_to_50: 4.72, over_50: 4.98 },
      { maxOz: 16, label: '14+ to 16 oz', under_10: 3.77, from_10_to_50: 4.78, over_50: 5.04 },
    ],
    peak: [
      { maxOz: 2, label: '2 oz or less', under_10: 3.74, from_10_to_50: 4.63, over_50: 4.89 },
      { maxOz: 4, label: '2+ to 4 oz', under_10: 3.8, from_10_to_50: 4.73, over_50: 4.99 },
      { maxOz: 6, label: '4+ to 6 oz', under_10: 3.88, from_10_to_50: 4.77, over_50: 5.03 },
      { maxOz: 8, label: '6+ to 8 oz', under_10: 3.98, from_10_to_50: 4.86, over_50: 5.12 },
      { maxOz: 10, label: '8+ to 10 oz', under_10: 4.1, from_10_to_50: 5.01, over_50: 5.27 },
      { maxOz: 12, label: '10+ to 12 oz', under_10: 4.14, from_10_to_50: 5.1, over_50: 5.36 },
      { maxOz: 14, label: '12+ to 14 oz', under_10: 4.25, from_10_to_50: 5.24, over_50: 5.5 },
      { maxOz: 16, label: '14+ to 16 oz', under_10: 4.32, from_10_to_50: 5.33, over_50: 5.59 },
    ],
  },
};

export const LARGE_STANDARD_FIXED: Record<
  FeeCategory,
  Record<Season, FixedBand[]>
> = {
  general: {
    non_peak: [
      { maxOz: 4, label: '4 oz or less', under_10: 2.91, from_10_to_50: 3.73, over_50: 3.99 },
      { maxOz: 8, label: '4+ to 8 oz', under_10: 3.13, from_10_to_50: 3.95, over_50: 4.21 },
      { maxOz: 12, label: '8+ to 12 oz', under_10: 3.38, from_10_to_50: 4.2, over_50: 4.46 },
      { maxOz: 16, label: '12+ to 16 oz', under_10: 3.78, from_10_to_50: 4.6, over_50: 4.86 },
      { maxOz: 20, label: '1+ to 1.25 lb', under_10: 4.22, from_10_to_50: 5.04, over_50: 5.3 },
      { maxOz: 24, label: '1.25+ to 1.5 lb', under_10: 4.6, from_10_to_50: 5.42, over_50: 5.68 },
      { maxOz: 28, label: '1.5+ to 1.75 lb', under_10: 4.75, from_10_to_50: 5.57, over_50: 5.83 },
      { maxOz: 32, label: '1.75+ to 2 lb', under_10: 5.0, from_10_to_50: 5.82, over_50: 6.08 },
      { maxOz: 36, label: '2+ to 2.25 lb', under_10: 5.1, from_10_to_50: 5.92, over_50: 6.18 },
      { maxOz: 40, label: '2.25+ to 2.5 lb', under_10: 5.28, from_10_to_50: 6.1, over_50: 6.36 },
      { maxOz: 44, label: '2.5+ to 2.75 lb', under_10: 5.44, from_10_to_50: 6.26, over_50: 6.52 },
      { maxOz: 48, label: '2.75+ to 3 lb', under_10: 5.85, from_10_to_50: 6.67, over_50: 6.93 },
    ],
    peak: [
      { maxOz: 4, label: '4 oz or less', under_10: 3.15, from_10_to_50: 3.97, over_50: 4.23 },
      { maxOz: 8, label: '4+ to 8 oz', under_10: 3.39, from_10_to_50: 4.21, over_50: 4.47 },
      { maxOz: 12, label: '8+ to 12 oz', under_10: 3.66, from_10_to_50: 4.48, over_50: 4.74 },
      { maxOz: 16, label: '12+ to 16 oz', under_10: 4.07, from_10_to_50: 4.89, over_50: 5.15 },
      { maxOz: 20, label: '1+ to 1.25 lb', under_10: 4.52, from_10_to_50: 5.34, over_50: 5.6 },
      { maxOz: 24, label: '1.25+ to 1.5 lb', under_10: 4.91, from_10_to_50: 5.73, over_50: 5.99 },
      { maxOz: 28, label: '1.5+ to 1.75 lb', under_10: 5.07, from_10_to_50: 5.89, over_50: 6.15 },
      { maxOz: 32, label: '1.75+ to 2 lb', under_10: 5.33, from_10_to_50: 6.15, over_50: 6.41 },
      { maxOz: 36, label: '2+ to 2.25 lb', under_10: 5.47, from_10_to_50: 6.29, over_50: 6.55 },
      { maxOz: 40, label: '2.25+ to 2.5 lb', under_10: 5.67, from_10_to_50: 6.49, over_50: 6.75 },
      { maxOz: 44, label: '2.5+ to 2.75 lb', under_10: 5.84, from_10_to_50: 6.66, over_50: 6.92 },
      { maxOz: 48, label: '2.75+ to 3 lb', under_10: 6.26, from_10_to_50: 7.08, over_50: 7.34 },
    ],
  },
  apparel: {
    non_peak: [
      { maxOz: 4, label: '4 oz or less', under_10: 3.48, from_10_to_50: 4.3, over_50: 4.56 },
      { maxOz: 8, label: '4+ to 8 oz', under_10: 3.68, from_10_to_50: 4.5, over_50: 4.76 },
      { maxOz: 12, label: '8+ to 12 oz', under_10: 3.9, from_10_to_50: 4.72, over_50: 4.98 },
      { maxOz: 16, label: '12+ to 16 oz', under_10: 4.35, from_10_to_50: 5.17, over_50: 5.43 },
      { maxOz: 20, label: '1+ to 1.25 lb', under_10: 5.05, from_10_to_50: 5.87, over_50: 6.13 },
      { maxOz: 24, label: '1.25+ to 1.5 lb', under_10: 5.22, from_10_to_50: 6.04, over_50: 6.3 },
      { maxOz: 28, label: '1.5+ to 1.75 lb', under_10: 5.32, from_10_to_50: 6.14, over_50: 6.4 },
      { maxOz: 32, label: '1.75+ to 2 lb', under_10: 5.43, from_10_to_50: 6.25, over_50: 6.51 },
      { maxOz: 36, label: '2+ to 2.25 lb', under_10: 5.78, from_10_to_50: 6.6, over_50: 6.86 },
      { maxOz: 40, label: '2.25+ to 2.5 lb', under_10: 5.9, from_10_to_50: 6.72, over_50: 6.98 },
      { maxOz: 44, label: '2.5+ to 2.75 lb', under_10: 5.95, from_10_to_50: 6.77, over_50: 7.03 },
      { maxOz: 48, label: '2.75+ to 3 lb', under_10: 6.08, from_10_to_50: 6.9, over_50: 7.16 },
    ],
    peak: [
      { maxOz: 4, label: '4 oz or less', under_10: 3.79, from_10_to_50: 4.61, over_50: 4.87 },
      { maxOz: 8, label: '4+ to 8 oz', under_10: 4.0, from_10_to_50: 4.82, over_50: 5.08 },
      { maxOz: 12, label: '8+ to 12 oz', under_10: 4.23, from_10_to_50: 5.05, over_50: 5.31 },
      { maxOz: 16, label: '12+ to 16 oz', under_10: 4.69, from_10_to_50: 5.51, over_50: 5.77 },
      { maxOz: 20, label: '1+ to 1.25 lb', under_10: 5.42, from_10_to_50: 6.24, over_50: 6.5 },
      { maxOz: 24, label: '1.25+ to 1.5 lb', under_10: 5.59, from_10_to_50: 6.41, over_50: 6.67 },
      { maxOz: 28, label: '1.5+ to 1.75 lb', under_10: 5.71, from_10_to_50: 6.53, over_50: 6.79 },
      { maxOz: 32, label: '1.75+ to 2 lb', under_10: 5.82, from_10_to_50: 6.64, over_50: 6.9 },
      { maxOz: 36, label: '2+ to 2.25 lb', under_10: 6.22, from_10_to_50: 7.04, over_50: 7.3 },
      { maxOz: 40, label: '2.25+ to 2.5 lb', under_10: 6.34, from_10_to_50: 7.16, over_50: 7.42 },
      { maxOz: 44, label: '2.5+ to 2.75 lb', under_10: 6.41, from_10_to_50: 7.23, over_50: 7.49 },
      { maxOz: 48, label: '2.75+ to 3 lb', under_10: 6.54, from_10_to_50: 7.36, over_50: 7.62 },
    ],
  },
  dangerous_goods: {
    non_peak: [
      { maxOz: 4, label: '4 oz or less', under_10: 3.73, from_10_to_50: 4.55, over_50: 4.81 },
      { maxOz: 8, label: '4+ to 8 oz', under_10: 3.94, from_10_to_50: 4.76, over_50: 5.02 },
      { maxOz: 12, label: '8+ to 12 oz', under_10: 4.17, from_10_to_50: 4.99, over_50: 5.25 },
      { maxOz: 16, label: '12+ to 16 oz', under_10: 4.37, from_10_to_50: 5.19, over_50: 5.45 },
      { maxOz: 20, label: '1+ to 1.25 lb', under_10: 4.82, from_10_to_50: 5.64, over_50: 5.9 },
      { maxOz: 24, label: '1.25+ to 1.5 lb', under_10: 5.2, from_10_to_50: 6.02, over_50: 6.28 },
      { maxOz: 28, label: '1.5+ to 1.75 lb', under_10: 5.35, from_10_to_50: 6.17, over_50: 6.43 },
      { maxOz: 32, label: '1.75+ to 2 lb', under_10: 5.49, from_10_to_50: 6.31, over_50: 6.57 },
      { maxOz: 36, label: '2+ to 2.25 lb', under_10: 5.56, from_10_to_50: 6.38, over_50: 6.64 },
      { maxOz: 40, label: '2.25+ to 2.5 lb', under_10: 5.74, from_10_to_50: 6.56, over_50: 6.82 },
      { maxOz: 44, label: '2.5+ to 2.75 lb', under_10: 5.9, from_10_to_50: 6.72, over_50: 6.98 },
      { maxOz: 48, label: '2.75+ to 3 lb', under_10: 6.31, from_10_to_50: 7.13, over_50: 7.39 },
    ],
    peak: [
      { maxOz: 4, label: '4 oz or less', under_10: 4.32, from_10_to_50: 5.14, over_50: 5.4 },
      { maxOz: 8, label: '4+ to 8 oz', under_10: 4.56, from_10_to_50: 5.38, over_50: 5.64 },
      { maxOz: 12, label: '8+ to 12 oz', under_10: 4.82, from_10_to_50: 5.64, over_50: 5.9 },
      { maxOz: 16, label: '12+ to 16 oz', under_10: 5.04, from_10_to_50: 5.86, over_50: 6.12 },
      { maxOz: 20, label: '1+ to 1.25 lb', under_10: 5.51, from_10_to_50: 6.33, over_50: 6.59 },
      { maxOz: 24, label: '1.25+ to 1.5 lb', under_10: 5.91, from_10_to_50: 6.73, over_50: 6.99 },
      { maxOz: 28, label: '1.5+ to 1.75 lb', under_10: 6.08, from_10_to_50: 6.9, over_50: 7.16 },
      { maxOz: 32, label: '1.75+ to 2 lb', under_10: 6.24, from_10_to_50: 7.06, over_50: 7.32 },
      { maxOz: 36, label: '2+ to 2.25 lb', under_10: 6.33, from_10_to_50: 7.15, over_50: 7.41 },
      { maxOz: 40, label: '2.25+ to 2.5 lb', under_10: 6.53, from_10_to_50: 7.35, over_50: 7.61 },
      { maxOz: 44, label: '2.5+ to 2.75 lb', under_10: 6.7, from_10_to_50: 7.52, over_50: 7.78 },
      { maxOz: 48, label: '2.75+ to 3 lb', under_10: 7.12, from_10_to_50: 7.94, over_50: 8.2 },
    ],
  },
};

export function largeStandardOver3(
  category: FeeCategory,
  season: Season,
): FormulaBand {
  const table: Record<FeeCategory, Record<Season, FormulaBand>> = {
    general: {
      non_peak: {
        kind: 'large_standard_over_3lb',
        label: '3+ lb to 20 lb',
        base: { under_10: 6.15, from_10_to_50: 6.97, over_50: 7.23 },
        perIncrement: 0.08,
        afterLb: 3,
        incrementLb: 0.25,
      },
      peak: {
        kind: 'large_standard_over_3lb',
        label: '3+ lb to 20 lb',
        base: { under_10: 6.69, from_10_to_50: 7.51, over_50: 7.77 },
        perIncrement: 0.08,
        afterLb: 3,
        incrementLb: 0.25,
      },
    },
    apparel: {
      non_peak: {
        kind: 'large_standard_over_3lb',
        label: '3+ lb to 20 lb',
        base: { under_10: 6.15, from_10_to_50: 6.97, over_50: 7.23 },
        perIncrement: 0.16,
        afterLb: 3,
        incrementLb: 0.5,
      },
      peak: {
        kind: 'large_standard_over_3lb',
        label: '3+ lb to 20 lb',
        base: { under_10: 6.82, from_10_to_50: 7.64, over_50: 7.9 },
        perIncrement: 0.16,
        afterLb: 3,
        incrementLb: 0.5,
      },
    },
    dangerous_goods: {
      non_peak: {
        kind: 'large_standard_over_3lb',
        label: '3+ lb to 20 lb',
        base: { under_10: 6.61, from_10_to_50: 7.43, over_50: 7.69 },
        perIncrement: 0.08,
        afterLb: 3,
        incrementLb: 0.25,
      },
      peak: {
        kind: 'large_standard_over_3lb',
        label: '3+ lb to 20 lb',
        base: { under_10: 7.51, from_10_to_50: 8.33, over_50: 8.59 },
        perIncrement: 0.08,
        afterLb: 3,
        incrementLb: 0.25,
      },
    },
  };
  return table[category][season];
}

export function bulkyFormula(
  tier: 'small_bulky' | 'large_bulky',
  category: FeeCategory,
  season: Season,
): FormulaBand {
  const isPeak = season === 'peak';
  const isDg = category === 'dangerous_goods';
  // Apparel bulky matches general in published cards
  const smallNp = isDg
    ? { under_10: 7.5, from_10_to_50: 8.27, over_50: 8.27 }
    : { under_10: 6.78, from_10_to_50: 7.55, over_50: 7.55 };
  const smallPk = isDg
    ? { under_10: 9.06, from_10_to_50: 9.83, over_50: 9.83 }
    : { under_10: 7.82, from_10_to_50: 8.59, over_50: 8.59 };
  const largeNp = isDg
    ? { under_10: 9.3, from_10_to_50: 10.07, over_50: 10.07 }
    : { under_10: 8.58, from_10_to_50: 9.35, over_50: 9.35 };
  const largePk = isDg
    ? { under_10: 10.86, from_10_to_50: 11.63, over_50: 11.63 }
    : { under_10: 9.62, from_10_to_50: 10.39, over_50: 10.39 };

  const base =
    tier === 'small_bulky'
      ? isPeak
        ? smallPk
        : smallNp
      : isPeak
        ? largePk
        : largeNp;

  return {
    kind: 'bulky',
    label: '0 to 50 lb',
    base,
    perIncrement: 0.38,
    afterLb: 1,
    incrementLb: 1,
  };
}

export function xlFormula(
  tier: SizeTier,
  category: FeeCategory,
  season: Season,
): FormulaBand {
  const isPeak = season === 'peak';
  const isDg = category === 'dangerous_goods';

  type Row = { base: Record<PriceBand, number>; afterLb: number; per: number };
  const rows: Record<string, { np: Row; pk: Row; dgNp: Row; dgPk: Row }> = {
    extra_large_0_50: {
      np: {
        base: { under_10: 25.56, from_10_to_50: 26.33, over_50: 26.33 },
        afterLb: 1,
        per: 0.38,
      },
      pk: {
        base: { under_10: 28.29, from_10_to_50: 29.06, over_50: 29.06 },
        afterLb: 1,
        per: 0.38,
      },
      dgNp: {
        base: { under_10: 27.67, from_10_to_50: 28.44, over_50: 28.44 },
        afterLb: 1,
        per: 0.38,
      },
      dgPk: {
        base: { under_10: 31.71, from_10_to_50: 32.48, over_50: 32.48 },
        afterLb: 1,
        per: 0.38,
      },
    },
    extra_large_50_70: {
      np: {
        base: { under_10: 36.55, from_10_to_50: 37.32, over_50: 37.32 },
        afterLb: 51,
        per: 0.75,
      },
      pk: {
        base: { under_10: 39.36, from_10_to_50: 40.13, over_50: 40.13 },
        afterLb: 51,
        per: 0.75,
      },
      dgNp: {
        base: { under_10: 39.76, from_10_to_50: 40.53, over_50: 40.53 },
        afterLb: 51,
        per: 0.75,
      },
      dgPk: {
        base: { under_10: 43.86, from_10_to_50: 44.63, over_50: 44.63 },
        afterLb: 51,
        per: 0.75,
      },
    },
    extra_large_70_150: {
      np: {
        base: { under_10: 50.55, from_10_to_50: 51.32, over_50: 51.32 },
        afterLb: 71,
        per: 0.75,
      },
      pk: {
        base: { under_10: 54.97, from_10_to_50: 55.74, over_50: 55.74 },
        afterLb: 71,
        per: 0.75,
      },
      dgNp: {
        base: { under_10: 57.68, from_10_to_50: 58.45, over_50: 58.45 },
        afterLb: 71,
        per: 0.75,
      },
      dgPk: {
        base: { under_10: 64.04, from_10_to_50: 64.81, over_50: 64.81 },
        afterLb: 71,
        per: 0.75,
      },
    },
    extra_large_150_plus: {
      np: {
        base: { under_10: 194.18, from_10_to_50: 194.95, over_50: 194.95 },
        afterLb: 151,
        per: 0.19,
      },
      pk: {
        base: { under_10: 202.69, from_10_to_50: 203.46, over_50: 203.46 },
        afterLb: 151,
        per: 0.19,
      },
      dgNp: {
        base: { under_10: 218.76, from_10_to_50: 219.53, over_50: 219.53 },
        afterLb: 151,
        per: 0.19,
      },
      dgPk: {
        base: { under_10: 230.84, from_10_to_50: 231.61, over_50: 231.61 },
        afterLb: 151,
        per: 0.19,
      },
    },
  };

  const row = rows[tier]!;
  const sel = isDg ? (isPeak ? row.dgPk : row.dgNp) : isPeak ? row.pk : row.np;
  return {
    kind: 'xl',
    label: tier,
    base: sel.base,
    perIncrement: sel.per,
    afterLb: sel.afterLb,
    incrementLb: 1,
  };
}

function applyFormula(f: FormulaBand, shippingWeightLb: number, priceBand: PriceBand): number {
  const base = f.base[priceBand];
  if (shippingWeightLb <= f.afterLb) return round2(base);
  const over = shippingWeightLb - f.afterLb;
  const increments = Math.ceil(over / f.incrementLb - 1e-9);
  return round2(base + increments * f.perIncrement);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function lookupFixed(
  bands: FixedBand[],
  shippingWeightOz: number,
  priceBand: PriceBand,
): { fee: number; label: string } {
  for (const b of bands) {
    if (shippingWeightOz <= b.maxOz + 1e-9) {
      return { fee: pick(b, priceBand), label: b.label };
    }
  }
  const last = bands[bands.length - 1]!;
  return { fee: pick(last, priceBand), label: last.label };
}

export function lookupFulfillmentFee(args: {
  sizeTier: SizeTier;
  shippingWeightLb: number;
  shippingWeightOz: number;
  category: FeeCategory;
  season: Season;
  sellingPriceUsd: number;
}): { expectedFeeUsd: number; priceBand: PriceBand; weightBandLabel: string } {
  const priceBand = priceBandFromSellingPrice(args.sellingPriceUsd);
  const { sizeTier, category, season } = args;

  if (sizeTier === 'small_standard') {
    const { fee, label } = lookupFixed(
      SMALL_STANDARD[category][season],
      args.shippingWeightOz,
      priceBand,
    );
    return { expectedFeeUsd: fee, priceBand, weightBandLabel: label };
  }

  if (sizeTier === 'large_standard') {
    if (args.shippingWeightLb <= 3) {
      const { fee, label } = lookupFixed(
        LARGE_STANDARD_FIXED[category][season],
        args.shippingWeightOz,
        priceBand,
      );
      return { expectedFeeUsd: fee, priceBand, weightBandLabel: label };
    }
    const f = largeStandardOver3(category, season);
    return {
      expectedFeeUsd: applyFormula(f, args.shippingWeightLb, priceBand),
      priceBand,
      weightBandLabel: f.label,
    };
  }

  if (sizeTier === 'small_bulky' || sizeTier === 'large_bulky') {
    const f = bulkyFormula(sizeTier, category, season);
    return {
      expectedFeeUsd: applyFormula(f, args.shippingWeightLb, priceBand),
      priceBand,
      weightBandLabel: `${sizeTier} ${f.label}`,
    };
  }

  const f = xlFormula(sizeTier, category, season);
  return {
    expectedFeeUsd: applyFormula(f, args.shippingWeightLb, priceBand),
    priceBand,
    weightBandLabel: f.label,
  };
}

/** Enumerate representative fees for reverse-matching a charged amount. */
export function enumerateFeeSamples(args: {
  category: FeeCategory;
  season: Season;
  sellingPriceUsd: number;
}): Array<{ sizeTier: SizeTier; weightBandLabel: string; fee: number; shippingWeightLb: number }> {
  const priceBand = priceBandFromSellingPrice(args.sellingPriceUsd);
  const out: Array<{
    sizeTier: SizeTier;
    weightBandLabel: string;
    fee: number;
    shippingWeightLb: number;
  }> = [];

  for (const b of SMALL_STANDARD[args.category][args.season]) {
    out.push({
      sizeTier: 'small_standard',
      weightBandLabel: b.label,
      fee: pick(b, priceBand),
      shippingWeightLb: b.maxOz / 16,
    });
  }

  for (const b of LARGE_STANDARD_FIXED[args.category][args.season]) {
    out.push({
      sizeTier: 'large_standard',
      weightBandLabel: b.label,
      fee: pick(b, priceBand),
      shippingWeightLb: b.maxOz / 16,
    });
  }

  // sample over-3lb large standard
  for (const lb of [3.25, 4, 5, 8, 12, 16, 20]) {
    const f = largeStandardOver3(args.category, args.season);
    out.push({
      sizeTier: 'large_standard',
      weightBandLabel: `${f.label} @ ${lb} lb`,
      fee: applyFormula(f, lb, priceBand),
      shippingWeightLb: lb,
    });
  }

  for (const tier of ['small_bulky', 'large_bulky'] as const) {
    const f = bulkyFormula(tier, args.category, args.season);
    for (const lb of [1, 5, 10, 20, 30, 50]) {
      out.push({
        sizeTier: tier,
        weightBandLabel: `${tier} @ ${lb} lb`,
        fee: applyFormula(f, lb, priceBand),
        shippingWeightLb: lb,
      });
    }
  }

  for (const tier of [
    'extra_large_0_50',
    'extra_large_50_70',
    'extra_large_70_150',
    'extra_large_150_plus',
  ] as SizeTier[]) {
    const f = xlFormula(tier, args.category, args.season);
    const samples =
      tier === 'extra_large_0_50'
        ? [1, 10, 25, 50]
        : tier === 'extra_large_50_70'
          ? [51, 60, 70]
          : tier === 'extra_large_70_150'
            ? [71, 100, 150]
            : [151, 200, 300];
    for (const lb of samples) {
      out.push({
        sizeTier: tier,
        weightBandLabel: `${tier} @ ${lb} lb`,
        fee: applyFormula(f, lb, priceBand),
        shippingWeightLb: lb,
      });
    }
  }

  return out;
}
