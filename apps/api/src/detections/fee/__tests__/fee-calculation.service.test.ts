import { analyzeOvercharge } from '../analyze';
import { dimensionalWeightLb } from '../dimensions';
import { seasonFromFeeDate } from '../season-from-date';
import { resolveSizeTier } from '../size-tier';
import { buildUs2026Snapshot } from '../us-2026-snapshot';

const card = buildUs2026Snapshot();

describe('dimensional weight', () => {
  it('large standard uses raw L×W×H/139 (no 2 in floor)', () => {
    const dw = dimensionalWeightLb(
      { lengthIn: 16.6, widthIn: 13.3, heightIn: 7.7, unitWeightOz: 105.6 },
      { applyMinTwoInches: false },
    );
    expect(dw).toBeCloseTo((16.6 * 13.3 * 7.7) / 139, 2);
  });

  it('bulky/XL floors the two smaller sides at 2 in', () => {
    const dw = dimensionalWeightLb(
      { lengthIn: 40, widthIn: 1, heightIn: 25, unitWeightOz: 72 },
      { applyMinTwoInches: true },
    );
    expect(dw).toBeCloseTo((40 * 2 * 25) / 139, 1);
  });
});

describe('size tier (Size Tiers.pdf 2026)', () => {
  it('classifies classic small standard', () => {
    const r = resolveSizeTier(
      {
        lengthIn: 8,
        widthIn: 5,
        heightIn: 0.5,
        unitWeightOz: 10,
      },
      card.sizeTierRules,
    );
    expect(r.sizeTier).toBe('small_standard');
    expect(r.shippingWeightOz).toBe(10);
  });

  it('bumps to large standard when shortest > 0.75', () => {
    const r = resolveSizeTier(
      {
        lengthIn: 8,
        widthIn: 5,
        heightIn: 1,
        unitWeightOz: 10,
      },
      card.sizeTierRules,
    );
    expect(r.sizeTier).toBe('large_standard');
  });

  it('classifies large bulky when dims exceed small bulky (2 in floor on dim wt)', () => {
    const r = resolveSizeTier(
      {
        lengthIn: 40,
        widthIn: 1,
        heightIn: 25,
        unitWeightOz: 72,
      },
      card.sizeTierRules,
    );
    expect(r.sizeTier).toBe('large_bulky');
    expect(r.shippingWeightLb).toBeCloseTo(14.4, 0);
  });
});

describe('seasonFromFeeDate', () => {
  it('treats Oct 15 – Jan 14 as peak', () => {
    expect(seasonFromFeeDate('2026-10-15', card.seasonWindows)).toBe('peak');
    expect(seasonFromFeeDate('2026-12-25', card.seasonWindows)).toBe('peak');
    expect(seasonFromFeeDate('2027-01-14', card.seasonWindows)).toBe('peak');
  });

  it('treats Jan 15 – Oct 14 as non-peak', () => {
    expect(seasonFromFeeDate('2026-01-15', card.seasonWindows)).toBe(
      'non_peak',
    );
    expect(seasonFromFeeDate('2026-06-01', card.seasonWindows)).toBe(
      'non_peak',
    );
    expect(seasonFromFeeDate('2026-10-14', card.seasonWindows)).toBe(
      'non_peak',
    );
  });
});

describe('analyzeOvercharge (Fee Changes.pdf 2026 via rate card snapshot)', () => {
  it('marks correct when charged matches non-peak expected', () => {
    const result = analyzeOvercharge(
      {
        lengthIn: 8,
        widthIn: 5,
        heightIn: 0.5,
        unitWeightOz: 10,
        category: 'general',
        feeDate: '2026-06-01',
        season: 'non_peak',
        sellingPriceUsd: 25,
        chargedFeeUsd: 3.68,
      },
      card,
    );
    expect(result.verdict).toBe('correct');
    expect(result.expectedFeeUsd).toBe(3.68);
    expect(result.rateCardId).toBe(card.id);
  });

  it('uses peak table when season is peak', () => {
    const result = analyzeOvercharge(
      {
        lengthIn: 8,
        widthIn: 5,
        heightIn: 0.5,
        unitWeightOz: 10,
        category: 'general',
        feeDate: '2026-11-01',
        season: 'peak',
        sellingPriceUsd: 25,
        chargedFeeUsd: 3.89,
      },
      card,
    );
    expect(result.expectedFeeUsd).toBe(3.89);
    expect(result.verdict).toBe('correct');
  });

  it('detects overcharge when charged matches large standard band', () => {
    const result = analyzeOvercharge(
      {
        lengthIn: 8,
        widthIn: 5,
        heightIn: 0.5,
        unitWeightOz: 10,
        category: 'general',
        feeDate: '2026-06-01',
        season: 'non_peak',
        sellingPriceUsd: 25,
        chargedFeeUsd: 4.2,
      },
      card,
    );
    expect(result.verdict).toBe('overcharged');
    expect(result.reverseMatch?.impliedSizeTier).toBe('large_standard');
  });
});
