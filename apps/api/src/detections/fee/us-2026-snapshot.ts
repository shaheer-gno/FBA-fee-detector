import {
  FEE_CATEGORIES,
  SEASONS,
  US_2026_RATE_CARD_ID,
  type SizeTier,
} from './constants';
import type {
  FeeRateCardSnapshot,
  FixedBandRow,
  FormulaBandRow,
  SizeTierRule,
} from './settings.types';
import {
  LARGE_STANDARD_FIXED,
  SMALL_STANDARD,
  bulkyFormula,
  largeStandardOver3,
  xlFormula,
} from './rate-cards.legacy-data';

/**
 * Builds the US 2026 fee rate card snapshot from the typed tables that
 * originally lived in rate-cards.ts. Used for seeding Postgres and for
 * unit tests that do not hit the DB.
 */
export function buildUs2026Snapshot(): FeeRateCardSnapshot {
  return {
    id: US_2026_RATE_CARD_ID,
    marketplace: 'US',
    name: 'US FBA fulfillment fees 2026',
    effectiveFrom: '2026-01-15',
    effectiveTo: null,
    sourceNote:
      'Seller Central US FBA fulfillment fee changes (2026). See amazon-sources/SOURCE.md.',
    isActive: true,
    seasonWindows: [
      {
        season: 'peak',
        startDate: '2026-10-15',
        endDate: '2027-01-14',
      },
      {
        season: 'non_peak',
        startDate: '2026-01-15',
        endDate: '2026-10-14',
      },
    ],
    sizeTierRules: US_2026_SIZE_TIER_RULES,
    fixedBands: collectFixedBands(),
    formulaBands: collectFormulaBands(),
  };
}

const US_2026_SIZE_TIER_RULES: SizeTierRule[] = [
  {
    sizeTier: 'small_standard',
    sortOrder: 1,
    maxLongestIn: 15,
    maxMedianIn: 12,
    maxShortestIn: 0.75,
    maxUnitWeightOz: 16,
    minShippingWeightLb: null,
    maxShippingWeightLb: null,
    maxLengthPlusGirthIn: null,
    shippingWeightMode: 'unit_only',
    dimWeightMinTwoIn: false,
  },
  {
    sizeTier: 'large_standard',
    sortOrder: 2,
    maxLongestIn: 18,
    maxMedianIn: 14,
    maxShortestIn: 8,
    maxUnitWeightOz: null,
    minShippingWeightLb: null,
    maxShippingWeightLb: 20,
    maxLengthPlusGirthIn: null,
    shippingWeightMode: 'max_unit_dim',
    dimWeightMinTwoIn: false,
  },
  {
    sizeTier: 'small_bulky',
    sortOrder: 3,
    maxLongestIn: 37,
    maxMedianIn: 28,
    maxShortestIn: 20,
    maxUnitWeightOz: null,
    minShippingWeightLb: null,
    maxShippingWeightLb: 50,
    maxLengthPlusGirthIn: 130,
    shippingWeightMode: 'max_unit_dim',
    dimWeightMinTwoIn: true,
  },
  {
    sizeTier: 'large_bulky',
    sortOrder: 4,
    maxLongestIn: 59,
    maxMedianIn: 33,
    maxShortestIn: 33,
    maxUnitWeightOz: null,
    minShippingWeightLb: null,
    maxShippingWeightLb: 50,
    maxLengthPlusGirthIn: 130,
    shippingWeightMode: 'max_unit_dim',
    dimWeightMinTwoIn: true,
  },
  {
    sizeTier: 'extra_large_0_50',
    sortOrder: 5,
    maxLongestIn: null,
    maxMedianIn: null,
    maxShortestIn: null,
    maxUnitWeightOz: null,
    minShippingWeightLb: null,
    maxShippingWeightLb: 50,
    maxLengthPlusGirthIn: null,
    shippingWeightMode: 'max_unit_dim',
    dimWeightMinTwoIn: true,
  },
  {
    sizeTier: 'extra_large_50_70',
    sortOrder: 6,
    maxLongestIn: null,
    maxMedianIn: null,
    maxShortestIn: null,
    maxUnitWeightOz: null,
    minShippingWeightLb: null,
    maxShippingWeightLb: 70,
    maxLengthPlusGirthIn: null,
    shippingWeightMode: 'max_unit_dim',
    dimWeightMinTwoIn: true,
  },
  {
    sizeTier: 'extra_large_70_150',
    sortOrder: 7,
    maxLongestIn: null,
    maxMedianIn: null,
    maxShortestIn: null,
    maxUnitWeightOz: null,
    minShippingWeightLb: null,
    maxShippingWeightLb: 150,
    maxLengthPlusGirthIn: null,
    shippingWeightMode: 'max_unit_dim',
    dimWeightMinTwoIn: true,
  },
  {
    sizeTier: 'extra_large_150_plus',
    sortOrder: 8,
    maxLongestIn: null,
    maxMedianIn: null,
    maxShortestIn: null,
    maxUnitWeightOz: null,
    minShippingWeightLb: null,
    maxShippingWeightLb: null,
    maxLengthPlusGirthIn: null,
    shippingWeightMode: 'unit_only',
    dimWeightMinTwoIn: true,
  },
];

function toFees(b: {
  under_10: number;
  from_10_to_50: number;
  over_50: number;
}) {
  return {
    under_10: b.under_10,
    from_10_to_50: b.from_10_to_50,
    over_50: b.over_50,
  };
}

function collectFixedBands(): FixedBandRow[] {
  const out: FixedBandRow[] = [];

  for (const category of FEE_CATEGORIES) {
    for (const season of SEASONS) {
      for (const r of SMALL_STANDARD[category][season]) {
        out.push({
          category,
          season,
          sizeTier: 'small_standard',
          maxOz: r.maxOz,
          label: r.label,
          fees: toFees(r),
        });
      }
      for (const r of LARGE_STANDARD_FIXED[category][season]) {
        out.push({
          category,
          season,
          sizeTier: 'large_standard',
          maxOz: r.maxOz,
          label: r.label,
          fees: toFees(r),
        });
      }
    }
  }

  return out;
}

function collectFormulaBands(): FormulaBandRow[] {
  const out: FormulaBandRow[] = [];

  for (const category of FEE_CATEGORIES) {
    for (const season of SEASONS) {
      const ls = largeStandardOver3(category, season);
      out.push({
        category,
        season,
        sizeTier: 'large_standard',
        label: ls.label,
        base: { ...ls.base },
        afterLb: ls.afterLb,
        incrementLb: ls.incrementLb,
        perIncrement: ls.perIncrement,
        minShippingWeightLb: 3,
      });

      for (const tier of ['small_bulky', 'large_bulky'] as const) {
        const f = bulkyFormula(tier, category, season);
        out.push({
          category,
          season,
          sizeTier: tier,
          label: f.label,
          base: { ...f.base },
          afterLb: f.afterLb,
          incrementLb: f.incrementLb,
          perIncrement: f.perIncrement,
          minShippingWeightLb: null,
        });
      }

      for (const tier of [
        'extra_large_0_50',
        'extra_large_50_70',
        'extra_large_70_150',
        'extra_large_150_plus',
      ] as SizeTier[]) {
        const f = xlFormula(tier, category, season);
        out.push({
          category,
          season,
          sizeTier: tier,
          label: f.label,
          base: { ...f.base },
          afterLb: f.afterLb,
          incrementLb: f.incrementLb,
          perIncrement: f.perIncrement,
          minShippingWeightLb: null,
        });
      }
    }
  }

  return out;
}
