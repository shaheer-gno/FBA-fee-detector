import type { DetectionDetailsView } from '../../../shared/ui/DetectionDetails';
import type { LatestDetectionSummary, Product } from '../types';

export function latestDetectionToDetailsView(
  product: Product,
  d: LatestDetectionSummary,
): DetectionDetailsView {
  return {
    title: product.sku,
    subtitle: [
      product.title,
      product.asin ? `ASIN ${product.asin}` : null,
      'Latest detection',
    ]
      .filter(Boolean)
      .join(' · '),
    createdAt: d.createdAt,
    feeDate: d.feeDate,
    season: d.season,
    source: d.source,
    lengthIn: d.lengthIn,
    widthIn: d.widthIn,
    heightIn: d.heightIn,
    unitWeightOz: d.unitWeightOz,
    category: d.category,
    sellingPriceUsd: d.sellingPriceUsd,
    sizeTier: d.sizeTier,
    shippingWeightLb: d.shippingWeightLb,
    shippingWeightOz: d.shippingWeightOz,
    dimensionalWeightLb: d.dimensionalWeightLb,
    priceBand: d.priceBand,
    weightBandLabel: d.weightBandLabel,
    expectedFeeUsd: d.expectedFeeUsd,
    chargedFeeUsd: d.chargedFeeUsd,
    differenceUsd: d.differenceUsd,
    verdict: d.verdict,
    explanation: d.explanation,
    reverseMatch:
      d.impliedSizeTier && d.impliedWeightBandLabel != null
        ? {
            impliedSizeTier: d.impliedSizeTier,
            impliedWeightBandLabel: d.impliedWeightBandLabel,
            matchedFeeUsd: d.matchedFeeUsd ?? 0,
            feeDeltaFromCharged: d.feeDeltaFromCharged ?? 0,
          }
        : null,
  };
}
