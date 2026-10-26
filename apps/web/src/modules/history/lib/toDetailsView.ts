import type { DetectionDetailsView } from '../../../shared/ui/DetectionDetails';
import type { DetectionRecord } from '../types';

export function detectionRecordToDetailsView(
  row: DetectionRecord,
): DetectionDetailsView {
  return {
    title: row.productSku ?? 'One-off analyze',
    subtitle: [
      row.productTitle,
      row.productAsin ? `ASIN ${row.productAsin}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    createdAt: row.createdAt,
    feeDate: row.input.feeDate,
    season: row.input.season,
    source: row.source,
    lengthIn: row.input.lengthIn,
    widthIn: row.input.widthIn,
    heightIn: row.input.heightIn,
    unitWeightOz: row.input.unitWeightOz,
    category: row.input.category,
    sellingPriceUsd: row.input.sellingPriceUsd,
    sizeTier: row.result.sizeTier,
    shippingWeightLb: row.result.shippingWeightLb,
    shippingWeightOz: row.result.shippingWeightOz,
    dimensionalWeightLb: row.result.dimensionalWeightLb,
    priceBand: row.result.priceBand,
    weightBandLabel: row.result.weightBandLabel,
    expectedFeeUsd: row.result.expectedFeeUsd,
    chargedFeeUsd: row.result.chargedFeeUsd,
    differenceUsd: row.result.differenceUsd,
    verdict: row.result.verdict,
    explanation: row.result.explanation,
    reverseMatch: row.result.reverseMatch,
  };
}
