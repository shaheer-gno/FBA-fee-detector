import type { FeeCategory } from '../../shared/api/types';

export type AnalyzePayload = {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  unitWeightOz: number;
  category: FeeCategory;
  sellingPriceUsd: number;
  feeDate: string;
  chargedFeeUsd: number;
};
