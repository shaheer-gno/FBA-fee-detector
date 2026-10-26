import {
  dimensionalWeightLb,
  lengthPlusGirth,
  sortSides,
  unitWeightLb,
} from './dimensions';
import type { SizeTierRule } from './settings.types';
import type { ProductDimensions, SizeTier, SizeTierResult } from './types';

function le(value: number, max: number | null): boolean {
  if (max == null) return true;
  return value <= max + 1e-9;
}

function ge(value: number, min: number | null): boolean {
  if (min == null) return true;
  return value >= min - 1e-9;
}

/**
 * Resolve size tier + shipping weight using first-fit rules from the rate card.
 * Preserves 2026 US behavior: XL 150+ fee shipping weight is unit-only;
 * unit weight &gt; 150 lb short-circuits to extra_large_150_plus.
 */
export function resolveSizeTier(
  d: ProductDimensions,
  rules: SizeTierRule[],
): SizeTierResult {
  const sides = sortSides(d);
  const girth = lengthPlusGirth(sides);
  const unitLb = unitWeightLb(d.unitWeightOz);
  const sorted = [...rules].sort((a, b) => a.sortOrder - b.sortOrder);

  // Match prior engine: unit &gt; 150 lb → XL 150+ with unit shipping weight
  if (unitLb > 150) {
    const xlRule =
      sorted.find((r) => r.sizeTier === 'extra_large_150_plus') ?? sorted[sorted.length - 1]!;
    const dimLb = dimensionalWeightLb(d, {
      applyMinTwoInches: xlRule.dimWeightMinTwoIn,
    });
    return {
      sizeTier: 'extra_large_150_plus',
      sides,
      lengthPlusGirth: girth,
      unitWeightLb: unitLb,
      dimensionalWeightLb: dimLb,
      shippingWeightLb: unitLb,
      shippingWeightOz: unitLb * 16,
    };
  }

  for (const rule of sorted) {
    const dimLb = dimensionalWeightLb(d, {
      applyMinTwoInches: rule.dimWeightMinTwoIn,
    });
    let shipLb =
      rule.shippingWeightMode === 'unit_only'
        ? unitLb
        : Math.max(unitLb, dimLb);

    // Extra-large 150+ always fees on unit weight when selected by dim-driven path
    if (rule.sizeTier === 'extra_large_150_plus') {
      shipLb = unitLb;
    }

    if (!le(sides.longest, rule.maxLongestIn)) continue;
    if (!le(sides.median, rule.maxMedianIn)) continue;
    if (!le(sides.shortest, rule.maxShortestIn)) continue;
    if (!le(d.unitWeightOz, rule.maxUnitWeightOz)) continue;
    if (!le(shipLb, rule.maxShippingWeightLb)) continue;
    if (!ge(shipLb, rule.minShippingWeightLb)) continue;
    if (!le(girth, rule.maxLengthPlusGirthIn)) continue;

    return {
      sizeTier: rule.sizeTier,
      sides,
      lengthPlusGirth: girth,
      unitWeightLb: unitLb,
      dimensionalWeightLb: dimLb,
      shippingWeightLb: shipLb,
      shippingWeightOz: shipLb * 16,
    };
  }

  const last = sorted[sorted.length - 1]!;
  const dimLb = dimensionalWeightLb(d, {
    applyMinTwoInches: last.dimWeightMinTwoIn,
  });
  const shipLb =
    last.shippingWeightMode === 'unit_only' ? unitLb : Math.max(unitLb, dimLb);
  return {
    sizeTier: last.sizeTier,
    sides,
    lengthPlusGirth: girth,
    unitWeightLb: unitLb,
    dimensionalWeightLb: dimLb,
    shippingWeightLb: shipLb,
    shippingWeightOz: shipLb * 16,
  };
}

export function sizeTierLabel(tier: SizeTier): string {
  const map: Record<SizeTier, string> = {
    small_standard: 'Small standard',
    large_standard: 'Large standard',
    small_bulky: 'Small bulky',
    large_bulky: 'Large bulky',
    extra_large_0_50: 'Extra-large 0–50 lb',
    extra_large_50_70: 'Extra-large 50+–70 lb',
    extra_large_70_150: 'Extra-large 70+–150 lb',
    extra_large_150_plus: 'Extra-large 150+ lb',
  };
  return map[tier];
}
