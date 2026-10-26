export type {
  DetectionSource,
  FeeCategory,
  PriceBand,
  Season,
  ShippingWeightMode,
  SizeTier,
  Verdict,
} from './constants';

export interface ProductDimensions {
  /** inches */
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  /** ounces */
  unitWeightOz: number;
}

export interface AnalyzeInput extends ProductDimensions {
  category: import('./constants').FeeCategory;
  sellingPriceUsd: number;
  /** Calendar date the fee applies to (YYYY-MM-DD); used to infer peak vs non-peak */
  feeDate: string;
  /** Inferred from feeDate — stored for querying */
  season: import('./constants').Season;
  chargedFeeUsd: number;
}

export interface SortedSides {
  longest: number;
  median: number;
  shortest: number;
}

export interface SizeTierResult {
  sizeTier: import('./constants').SizeTier;
  sides: SortedSides;
  lengthPlusGirth: number;
  unitWeightLb: number;
  dimensionalWeightLb: number;
  shippingWeightLb: number;
  shippingWeightOz: number;
}

export interface FeeLookupResult {
  expectedFeeUsd: number;
  priceBand: import('./constants').PriceBand;
  weightBandLabel: string;
}

export interface ReverseMatch {
  impliedSizeTier: import('./constants').SizeTier;
  impliedWeightBandLabel: string;
  matchedFeeUsd: number;
  feeDeltaFromCharged: number;
}

export interface AnalyzeResult {
  sizeTier: import('./constants').SizeTier;
  shippingWeightLb: number;
  shippingWeightOz: number;
  dimensionalWeightLb: number;
  priceBand: import('./constants').PriceBand;
  weightBandLabel: string;
  expectedFeeUsd: number;
  chargedFeeUsd: number;
  differenceUsd: number;
  verdict: import('./constants').Verdict;
  explanation: string;
  reverseMatch: ReverseMatch | null;
  /** Rate card used for this calculation (DB-backed). */
  rateCardId: string;
}
