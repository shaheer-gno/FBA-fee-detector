import { enumerateFeeSamples, lookupFulfillmentFee } from './rate-cards';
import type { FeeRateCardSnapshot } from './settings.types';
import { resolveSizeTier, sizeTierLabel } from './size-tier';
import type { AnalyzeInput, AnalyzeResult, ReverseMatch, Verdict } from './types';

const TOLERANCE = 0.01;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function findReverseMatch(
  input: AnalyzeInput,
  expectedFee: number,
  card: FeeRateCardSnapshot,
): ReverseMatch | null {
  const samples = enumerateFeeSamples(
    {
      category: input.category,
      season: input.season,
      sellingPriceUsd: input.sellingPriceUsd,
    },
    card,
  );

  let best: ReverseMatch | null = null;
  for (const s of samples) {
    const delta = Math.abs(s.fee - input.chargedFeeUsd);
    if (!best || delta < best.feeDeltaFromCharged) {
      best = {
        impliedSizeTier: s.sizeTier,
        impliedWeightBandLabel: s.weightBandLabel,
        matchedFeeUsd: s.fee,
        feeDeltaFromCharged: round2(delta),
      };
    }
  }

  if (!best) return null;
  if (Math.abs(input.chargedFeeUsd - expectedFee) <= TOLERANCE) return null;
  return best;
}

export function analyzeOvercharge(
  input: AnalyzeInput,
  card: FeeRateCardSnapshot,
): AnalyzeResult {
  if (
    input.lengthIn <= 0 ||
    input.widthIn <= 0 ||
    input.heightIn <= 0 ||
    input.unitWeightOz <= 0
  ) {
    throw new Error('Dimensions and unit weight must be positive');
  }
  if (input.sellingPriceUsd < 0) {
    throw new Error('Selling price must be >= 0');
  }
  if (input.chargedFeeUsd < 0) {
    throw new Error('Charged fee must be >= 0');
  }

  const tier = resolveSizeTier(input, card.sizeTierRules);
  const fee = lookupFulfillmentFee(
    {
      sizeTier: tier.sizeTier,
      shippingWeightLb: tier.shippingWeightLb,
      shippingWeightOz: tier.shippingWeightOz,
      category: input.category,
      season: input.season,
      sellingPriceUsd: input.sellingPriceUsd,
    },
    card,
  );

  const expectedFeeUsd = fee.expectedFeeUsd;
  const chargedFeeUsd = round2(input.chargedFeeUsd);
  const differenceUsd = round2(chargedFeeUsd - expectedFeeUsd);

  let verdict: Verdict = 'correct';
  if (differenceUsd > TOLERANCE) verdict = 'overcharged';
  else if (differenceUsd < -TOLERANCE) verdict = 'undercharged';

  const reverseMatch = findReverseMatch(input, expectedFeeUsd, card);

  let explanation: string;
  if (verdict === 'correct') {
    explanation = `Fee looks correct for ${sizeTierLabel(tier.sizeTier)} (${fee.weightBandLabel}).`;
  } else if (verdict === 'overcharged' && reverseMatch) {
    explanation =
      `Charged fee ($${chargedFeeUsd.toFixed(2)}) is higher than expected ($${expectedFeeUsd.toFixed(2)}). ` +
      `Charged fee closest match: ${sizeTierLabel(reverseMatch.impliedSizeTier)} / ${reverseMatch.impliedWeightBandLabel}. ` +
      `Your dimensions place it in ${sizeTierLabel(tier.sizeTier)} (${fee.weightBandLabel}). ` +
      `Likely Amazon measured into a higher tier or weight band — dispute with proof of true package dims/weight.`;
  } else if (verdict === 'overcharged') {
    explanation =
      `Charged fee ($${chargedFeeUsd.toFixed(2)}) exceeds expected ($${expectedFeeUsd.toFixed(2)}) ` +
      `for ${sizeTierLabel(tier.sizeTier)}. Review Amazon's recorded dimensions/weight.`;
  } else {
    explanation =
      `Charged fee ($${chargedFeeUsd.toFixed(2)}) is lower than expected ($${expectedFeeUsd.toFixed(2)}) ` +
      `for ${sizeTierLabel(tier.sizeTier)}. May be SIPP discount, Low Price program, or different season/category.`;
  }

  return {
    sizeTier: tier.sizeTier,
    shippingWeightLb: round2(tier.shippingWeightLb),
    shippingWeightOz: round2(tier.shippingWeightOz),
    dimensionalWeightLb: round2(tier.dimensionalWeightLb),
    priceBand: fee.priceBand,
    weightBandLabel: fee.weightBandLabel,
    expectedFeeUsd,
    chargedFeeUsd,
    differenceUsd,
    verdict,
    explanation,
    reverseMatch,
    rateCardId: card.id,
  };
}
