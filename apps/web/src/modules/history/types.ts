import type { AnalyzeResponse, FeeCategory } from '../../shared/api/types';

export type DetectionRecord = {
  id: string;
  createdAt: string;
  productId: string | null;
  productSku: string | null;
  productAsin: string | null;
  productTitle: string | null;
  source: 'manual' | 'product' | 'daily_job';
  input: {
    lengthIn: number;
    widthIn: number;
    heightIn: number;
    unitWeightOz: number;
    category: FeeCategory;
    sellingPriceUsd: number;
    feeDate: string;
    chargedFeeUsd: number;
    season: 'non_peak' | 'peak';
  };
  result: Omit<
    AnalyzeResponse,
    'id' | 'createdAt' | 'feeDate' | 'season' | 'productId' | 'source'
  >;
};
