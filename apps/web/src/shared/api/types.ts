export type FeeCategory = 'general' | 'apparel' | 'dangerous_goods';

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Shared detection result shape (products detect, analyze, history). */
export type AnalyzeResponse = {
  id: string;
  createdAt: string;
  feeDate: string;
  season: 'non_peak' | 'peak';
  productId: string | null;
  source: 'manual' | 'product' | 'daily_job';
  sizeTier: string;
  shippingWeightLb: number;
  shippingWeightOz: number;
  dimensionalWeightLb: number;
  priceBand: string;
  weightBandLabel: string;
  expectedFeeUsd: number;
  chargedFeeUsd: number;
  differenceUsd: number;
  verdict: 'correct' | 'overcharged' | 'undercharged';
  explanation: string;
  reverseMatch: {
    impliedSizeTier: string;
    impliedWeightBandLabel: string;
    matchedFeeUsd: number;
    feeDeltaFromCharged: number;
  } | null;
  rateCardId?: string;
};
