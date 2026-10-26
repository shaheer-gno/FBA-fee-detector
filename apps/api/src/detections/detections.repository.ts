import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  pageRange,
  type PageParams,
  type PageResult,
} from '../common/pagination';
import { SupabaseService } from '../supabase/supabase.service';
import type { AnalyzeInput, AnalyzeResult, ReverseMatch } from './fee/types';

export type DetectionSource = 'manual' | 'product' | 'daily_job';

export interface DetectionRecord {
  id: string;
  createdAt: string;
  productId: string | null;
  /** Joined from products when productId is set */
  productSku: string | null;
  productAsin: string | null;
  productTitle: string | null;
  source: DetectionSource;
  input: AnalyzeInput;
  result: AnalyzeResult;
}

export type SaveDetectionMeta = {
  productId?: string | null;
  source?: DetectionSource;
  runDate?: string;
};

type DetectionRow = {
  id: string;
  created_at: string;
  product_id: string | null;
  run_date: string;
  source: DetectionSource;
  fee_date: string;
  length_in: number;
  width_in: number;
  height_in: number;
  unit_weight_oz: number;
  category: AnalyzeInput['category'];
  season: AnalyzeInput['season'];
  selling_price_usd: number;
  charged_fee_usd: number;
  size_tier: AnalyzeResult['sizeTier'];
  shipping_weight_lb: number;
  shipping_weight_oz: number;
  dimensional_weight_lb: number;
  price_band: AnalyzeResult['priceBand'];
  weight_band_label: string;
  expected_fee_usd: number;
  difference_usd: number;
  verdict: AnalyzeResult['verdict'];
  explanation: string;
  implied_size_tier: AnalyzeResult['sizeTier'] | null;
  implied_weight_band_label: string | null;
  matched_fee_usd: number | null;
  fee_delta_from_charged: number | null;
  rate_card_id: string | null;
};

function toRow(
  id: string,
  createdAt: string,
  input: AnalyzeInput,
  result: AnalyzeResult,
  meta: SaveDetectionMeta,
): DetectionRow {
  const rm = result.reverseMatch;
  const runDate = meta.runDate ?? input.feeDate;
  return {
    id,
    created_at: createdAt,
    product_id: meta.productId ?? null,
    run_date: runDate,
    source: meta.source ?? 'manual',
    fee_date: input.feeDate,
    length_in: input.lengthIn,
    width_in: input.widthIn,
    height_in: input.heightIn,
    unit_weight_oz: input.unitWeightOz,
    category: input.category,
    season: input.season,
    selling_price_usd: input.sellingPriceUsd,
    charged_fee_usd: input.chargedFeeUsd,
    size_tier: result.sizeTier,
    shipping_weight_lb: result.shippingWeightLb,
    shipping_weight_oz: result.shippingWeightOz,
    dimensional_weight_lb: result.dimensionalWeightLb,
    price_band: result.priceBand,
    weight_band_label: result.weightBandLabel,
    expected_fee_usd: result.expectedFeeUsd,
    difference_usd: result.differenceUsd,
    verdict: result.verdict,
    explanation: result.explanation,
    implied_size_tier: rm?.impliedSizeTier ?? null,
    implied_weight_band_label: rm?.impliedWeightBandLabel ?? null,
    matched_fee_usd: rm?.matchedFeeUsd ?? null,
    fee_delta_from_charged: rm?.feeDeltaFromCharged ?? null,
    rate_card_id: result.rateCardId,
  };
}

function fromRow(row: DetectionRow): DetectionRecord {
  const reverseMatch: ReverseMatch | null =
    row.implied_size_tier && row.implied_weight_band_label != null
      ? {
          impliedSizeTier: row.implied_size_tier,
          impliedWeightBandLabel: row.implied_weight_band_label,
          matchedFeeUsd: Number(row.matched_fee_usd ?? 0),
          feeDeltaFromCharged: Number(row.fee_delta_from_charged ?? 0),
        }
      : null;

  return {
    id: row.id,
    createdAt: row.created_at,
    productId: row.product_id,
    productSku: null,
    productAsin: null,
    productTitle: null,
    source: row.source,
    input: {
      lengthIn: Number(row.length_in),
      widthIn: Number(row.width_in),
      heightIn: Number(row.height_in),
      unitWeightOz: Number(row.unit_weight_oz),
      category: row.category,
      feeDate: String(row.fee_date).slice(0, 10),
      season: row.season,
      sellingPriceUsd: Number(row.selling_price_usd),
      chargedFeeUsd: Number(row.charged_fee_usd),
    },
    result: {
      sizeTier: row.size_tier,
      shippingWeightLb: Number(row.shipping_weight_lb),
      shippingWeightOz: Number(row.shipping_weight_oz),
      dimensionalWeightLb: Number(row.dimensional_weight_lb),
      priceBand: row.price_band,
      weightBandLabel: row.weight_band_label,
      expectedFeeUsd: Number(row.expected_fee_usd),
      chargedFeeUsd: Number(row.charged_fee_usd),
      differenceUsd: Number(row.difference_usd),
      verdict: row.verdict,
      explanation: row.explanation,
      reverseMatch,
      rateCardId: row.rate_card_id ?? '',
    },
  };
}

@Injectable()
export class DetectionsRepository {
  private readonly logger = new Logger(DetectionsRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async save(
    input: AnalyzeInput,
    result: AnalyzeResult,
    meta: SaveDetectionMeta = {},
  ): Promise<DetectionRecord> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const row = toRow(id, createdAt, input, result, meta);

    const { data, error } = await this.supabase.client
      .from('detections')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Supabase insert failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to save detection to Supabase: ${error.message}`,
      );
    }

    return fromRow(data as DetectionRow);
  }

  async listPage(
    params: PageParams,
    opts: { productId?: string; verdict?: AnalyzeResult['verdict'] } = {},
  ): Promise<PageResult<DetectionRecord>> {
    const { from, to } = pageRange(params);

    let query = this.supabase.client
      .from('detections')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (opts.productId) {
      query = query.eq('product_id', opts.productId);
    }
    if (opts.verdict) {
      query = query.eq('verdict', opts.verdict);
    }

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Supabase list failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to list detections from Supabase: ${error.message}`,
      );
    }

    return {
      items: (data as DetectionRow[]).map(fromRow),
      total: count ?? 0,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
