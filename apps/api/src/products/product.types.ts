import type {
  FeeCategory,
  Season,
  SizeTier,
  Verdict,
} from '../detections/fee/types';

export type FeeSource = 'manual' | 'fee_preview' | 'settlement';

/** Latest detection snapshot attached on product list responses. */
export interface LatestDetectionSummary {
  id: string;
  createdAt: string;
  feeDate: string;
  season: Season;
  source: 'manual' | 'product' | 'daily_job';
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  unitWeightOz: number;
  category: FeeCategory;
  sellingPriceUsd: number;
  sizeTier: SizeTier;
  shippingWeightLb: number;
  shippingWeightOz: number;
  dimensionalWeightLb: number;
  priceBand: string;
  weightBandLabel: string;
  expectedFeeUsd: number;
  chargedFeeUsd: number;
  differenceUsd: number;
  verdict: Verdict;
  explanation: string;
  impliedSizeTier: SizeTier | null;
  impliedWeightBandLabel: string | null;
  matchedFeeUsd: number | null;
  feeDeltaFromCharged: number | null;
}

export interface Product {
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
  /** Amazon charged / estimated FBA fee */
  lastChargedFeeUsd: number | null;
  /** manual | fee_preview (estimate) | settlement (actual charged) */
  feeSource: FeeSource;
  active: boolean;
  /** Most recent detection for this SKU (null if never run). */
  latestDetection: LatestDetectionSummary | null;
}

export type CreateProductInput = {
  sku: string;
  asin?: string | null;
  title?: string | null;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  unitWeightOz: number;
  category: FeeCategory;
  sellingPriceUsd: number;
  lastChargedFeeUsd: number;
  feeSource?: FeeSource;
  active?: boolean;
};

export type UpdateProductInput = Partial<
  Omit<CreateProductInput, 'lastChargedFeeUsd' | 'feeSource'>
> & {
  lastChargedFeeUsd?: number | null;
  feeSource?: FeeSource;
};

export type FeePreviewImportResult = {
  created: number;
  updated: number;
  skipped: number;
  issues: { line: number; sku?: string; reason: string }[];
  productIds: string[];
};

export type AmazonReportsImportResult = {
  detected: {
    name: string;
    type: string;
  }[];
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
  detect: {
    ran: number;
    skipped: number;
    feeDate: string;
  };
  issues: { file?: string; line: number; sku?: string; reason: string }[];
  productIds: string[];
};
