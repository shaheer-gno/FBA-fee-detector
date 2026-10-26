import type { AnalyzeResponse, FeeCategory } from '../../shared/api/types';

export type LatestDetectionSummary = {
  id: string;
  createdAt: string;
  feeDate: string;
  season: 'non_peak' | 'peak';
  source: 'manual' | 'product' | 'daily_job';
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  unitWeightOz: number;
  category: FeeCategory;
  sellingPriceUsd: number;
  sizeTier: string;
  shippingWeightLb: number;
  shippingWeightOz: number;
  dimensionalWeightLb: number;
  priceBand: string;
  weightBandLabel: string;
  expectedFeeUsd: number;
  chargedFeeUsd: number;
  differenceUsd: number;
  verdict: AnalyzeResponse['verdict'];
  explanation: string;
  impliedSizeTier: string | null;
  impliedWeightBandLabel: string | null;
  matchedFeeUsd: number | null;
  feeDeltaFromCharged: number | null;
};

export type FeeSource = 'manual' | 'fee_preview' | 'settlement';

export type Product = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sku: string;
  asin: string | null;
  title: string | null;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  unitWeightOz: number;
  category: FeeCategory;
  sellingPriceUsd: number;
  lastChargedFeeUsd: number | null;
  feeSource: FeeSource;
  active: boolean;
  latestDetection: LatestDetectionSummary | null;
};

export type FeePreviewImportResult = {
  created: number;
  updated: number;
  skipped: number;
  issues: { line: number; sku?: string; reason: string }[];
  productIds: string[];
};

export type AmazonReportsImportResult = {
  detected: { name: string; type: string }[];
  feePreview: {
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
  };
  settlement: {
    skusUpdated: number;
    unchanged: number;
    chargeRows: number;
    skipped: number;
  };
  merchant: { enriched: number; unchanged: number; skipped: number };
  myi: { enriched: number; unchanged: number; skipped: number };
  orders: { noted: number; message: string };
  detect: { ran: number; skipped: number; feeDate: string };
  issues: { file?: string; line: number; sku?: string; reason: string }[];
  productIds: string[];
};

export type CreateProductPayload = {
  sku: string;
  asin?: string | null;
  title?: string | null;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  unitWeightOz: number;
  category: FeeCategory;
  sellingPriceUsd: number;
  /** Required — Amazon charged FBA fee (manual until SP-API). */
  lastChargedFeeUsd: number;
  active?: boolean;
};

export type RunDailyResponse = {
  feeDate: string;
  season: 'non_peak' | 'peak';
  rateCardId?: string;
  ran: AnalyzeResponse[];
  skipped: { productId: string; sku: string; reason: string }[];
};
