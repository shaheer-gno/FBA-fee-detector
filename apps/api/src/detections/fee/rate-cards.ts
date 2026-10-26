/**
 * Fee lookup against a FeeRateCardSnapshot (DB-backed / seeded).
 * Algorithms stay here; numbers live on the snapshot.
 */
import {
  PRICE_BAND_MID_MAX,
  PRICE_BAND_UNDER_MAX,
  type FeeCategory,
  type PriceBand,
  type Season,
  type SizeTier,
} from './constants';
import type { FeeRateCardSnapshot, FixedBandRow, FormulaBandRow } from './settings.types';

export function priceBandFromSellingPrice(priceUsd: number): PriceBand {
  if (priceUsd < PRICE_BAND_UNDER_MAX) return 'under_10';
  if (priceUsd <= PRICE_BAND_MID_MAX) return 'from_10_to_50';
  return 'over_50';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pickFee(fees: FixedBandRow['fees'] | FormulaBandRow['base'], priceBand: PriceBand): number {
  return fees[priceBand];
}

function lookupFixed(
  bands: FixedBandRow[],
  shippingWeightOz: number,
  priceBand: PriceBand,
): { fee: number; label: string } {
  for (const b of bands) {
    if (shippingWeightOz <= b.maxOz + 1e-9) {
      return { fee: pickFee(b.fees, priceBand), label: b.label };
    }
  }
  const last = bands[bands.length - 1]!;
  return { fee: pickFee(last.fees, priceBand), label: last.label };
}

function applyFormula(
  f: FormulaBandRow,
  shippingWeightLb: number,
  priceBand: PriceBand,
): number {
  const base = pickFee(f.base, priceBand);
  if (shippingWeightLb <= f.afterLb) return round2(base);
  const over = shippingWeightLb - f.afterLb;
  const increments = Math.ceil(over / f.incrementLb - 1e-9);
  return round2(base + increments * f.perIncrement);
}

function fixedFor(
  card: FeeRateCardSnapshot,
  category: FeeCategory,
  season: Season,
  sizeTier: SizeTier,
): FixedBandRow[] {
  return card.fixedBands
    .filter(
      (b) =>
        b.category === category &&
        b.season === season &&
        b.sizeTier === sizeTier,
    )
    .sort((a, b) => a.maxOz - b.maxOz);
}

function formulaFor(
  card: FeeRateCardSnapshot,
  category: FeeCategory,
  season: Season,
  sizeTier: SizeTier,
): FormulaBandRow | undefined {
  return card.formulaBands.find(
    (b) =>
      b.category === category &&
      b.season === season &&
      b.sizeTier === sizeTier,
  );
}

export function lookupFulfillmentFee(
  args: {
    sizeTier: SizeTier;
    shippingWeightLb: number;
    shippingWeightOz: number;
    category: FeeCategory;
    season: Season;
    sellingPriceUsd: number;
  },
  card: FeeRateCardSnapshot,
): { expectedFeeUsd: number; priceBand: PriceBand; weightBandLabel: string } {
  const priceBand = priceBandFromSellingPrice(args.sellingPriceUsd);
  const { sizeTier, category, season } = args;

  if (sizeTier === 'small_standard') {
    const { fee, label } = lookupFixed(
      fixedFor(card, category, season, 'small_standard'),
      args.shippingWeightOz,
      priceBand,
    );
    return { expectedFeeUsd: fee, priceBand, weightBandLabel: label };
  }

  if (sizeTier === 'large_standard') {
    if (args.shippingWeightLb <= 3) {
      const { fee, label } = lookupFixed(
        fixedFor(card, category, season, 'large_standard'),
        args.shippingWeightOz,
        priceBand,
      );
      return { expectedFeeUsd: fee, priceBand, weightBandLabel: label };
    }
    const f = formulaFor(card, category, season, 'large_standard');
    if (!f) throw new Error('Missing large_standard formula band on rate card');
    return {
      expectedFeeUsd: applyFormula(f, args.shippingWeightLb, priceBand),
      priceBand,
      weightBandLabel: f.label,
    };
  }

  if (sizeTier === 'small_bulky' || sizeTier === 'large_bulky') {
    const f = formulaFor(card, category, season, sizeTier);
    if (!f) throw new Error(`Missing ${sizeTier} formula band on rate card`);
    return {
      expectedFeeUsd: applyFormula(f, args.shippingWeightLb, priceBand),
      priceBand,
      weightBandLabel: `${sizeTier} ${f.label}`,
    };
  }

  const f = formulaFor(card, category, season, sizeTier);
  if (!f) throw new Error(`Missing ${sizeTier} formula band on rate card`);
  return {
    expectedFeeUsd: applyFormula(f, args.shippingWeightLb, priceBand),
    priceBand,
    weightBandLabel: f.label,
  };
}

/** Enumerate representative fees for reverse-matching a charged amount. */
export function enumerateFeeSamples(
  args: {
    category: FeeCategory;
    season: Season;
    sellingPriceUsd: number;
  },
  card: FeeRateCardSnapshot,
): Array<{
  sizeTier: SizeTier;
  weightBandLabel: string;
  fee: number;
  shippingWeightLb: number;
}> {
  const priceBand = priceBandFromSellingPrice(args.sellingPriceUsd);
  const out: Array<{
    sizeTier: SizeTier;
    weightBandLabel: string;
    fee: number;
    shippingWeightLb: number;
  }> = [];

  for (const b of fixedFor(card, args.category, args.season, 'small_standard')) {
    out.push({
      sizeTier: 'small_standard',
      weightBandLabel: b.label,
      fee: pickFee(b.fees, priceBand),
      shippingWeightLb: b.maxOz / 16,
    });
  }

  for (const b of fixedFor(card, args.category, args.season, 'large_standard')) {
    out.push({
      sizeTier: 'large_standard',
      weightBandLabel: b.label,
      fee: pickFee(b.fees, priceBand),
      shippingWeightLb: b.maxOz / 16,
    });
  }

  const lsFormula = formulaFor(card, args.category, args.season, 'large_standard');
  if (lsFormula) {
    for (const lb of [3.25, 4, 5, 8, 12, 16, 20]) {
      out.push({
        sizeTier: 'large_standard',
        weightBandLabel: `${lsFormula.label} @ ${lb} lb`,
        fee: applyFormula(lsFormula, lb, priceBand),
        shippingWeightLb: lb,
      });
    }
  }

  for (const tier of ['small_bulky', 'large_bulky'] as const) {
    const f = formulaFor(card, args.category, args.season, tier);
    if (!f) continue;
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
    const f = formulaFor(card, args.category, args.season, tier);
    if (!f) continue;
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
