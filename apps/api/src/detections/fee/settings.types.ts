import type {
  FeeCategory,
  PriceBand,
  Season,
  ShippingWeightMode,
  SizeTier,
} from './constants';

export type SeasonWindow = {
  season: Season;
  startDate: string; // YYYY-MM-DD
  endDate: string;
};

export type SizeTierRule = {
  sizeTier: SizeTier;
  sortOrder: number;
  maxLongestIn: number | null;
  maxMedianIn: number | null;
  maxShortestIn: number | null;
  maxUnitWeightOz: number | null;
  minShippingWeightLb: number | null;
  maxShippingWeightLb: number | null;
  maxLengthPlusGirthIn: number | null;
  shippingWeightMode: ShippingWeightMode;
  dimWeightMinTwoIn: boolean;
};

export type FixedBandRow = {
  category: FeeCategory;
  season: Season;
  sizeTier: SizeTier;
  maxOz: number;
  label: string;
  fees: Record<PriceBand, number>;
};

export type FormulaBandRow = {
  category: FeeCategory;
  season: Season;
  sizeTier: SizeTier;
  label: string;
  base: Record<PriceBand, number>;
  afterLb: number;
  incrementLb: number;
  perIncrement: number;
  /** When set, formula applies only if shipping weight > this (e.g. 3 for large standard). */
  minShippingWeightLb: number | null;
};

export type FeeRateCardSnapshot = {
  id: string;
  marketplace: string;
  name: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceNote: string;
  isActive: boolean;
  seasonWindows: SeasonWindow[];
  sizeTierRules: SizeTierRule[];
  fixedBands: FixedBandRow[];
  formulaBands: FormulaBandRow[];
};
