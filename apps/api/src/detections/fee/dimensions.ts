import type { ProductDimensions, SortedSides } from './types';

export function sortSides(d: ProductDimensions): SortedSides {
  const sorted = [d.lengthIn, d.widthIn, d.heightIn].sort((a, b) => b - a);
  return {
    longest: sorted[0]!,
    median: sorted[1]!,
    shortest: sorted[2]!,
  };
}

export function lengthPlusGirth(sides: SortedSides): number {
  return sides.longest + 2 * (sides.median + sides.shortest);
}

/**
 * US dimensional weight = (L × W × H) / 139.
 *
 * Per Fee Changes FAQ + Shipping Weight.pdf:
 * for small bulky / large bulky / extra-large, the two smaller sides
 * are floored at 2 inches. Large standard uses raw dimensions (no floor).
 */
export function dimensionalWeightLb(
  d: ProductDimensions,
  options?: { applyMinTwoInches?: boolean },
): number {
  const sides = [d.lengthIn, d.widthIn, d.heightIn].sort((a, b) => b - a);
  const longest = sides[0]!;
  let median = sides[1]!;
  let shortest = sides[2]!;
  if (options?.applyMinTwoInches) {
    median = Math.max(median, 2);
    shortest = Math.max(shortest, 2);
  }
  return (longest * median * shortest) / 139;
}

export function unitWeightLb(unitWeightOz: number): number {
  return unitWeightOz / 16;
}
