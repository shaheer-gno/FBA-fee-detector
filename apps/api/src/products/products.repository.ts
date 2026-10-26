import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DbConflictError, DbNotFoundError } from '../common/db-errors';
import {
  pageRange,
  type PageParams,
  type PageResult,
} from '../common/pagination';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  CreateProductInput,
  FeeSource,
  LatestDetectionSummary,
  Product,
  UpdateProductInput,
} from './product.types';

type ProductRow = {
  id: string;
  created_at: string;
  updated_at: string;
  sku: string;
  asin: string | null;
  title: string | null;
  length_in: number;
  width_in: number;
  height_in: number;
  unit_weight_oz: number;
  category: Product['category'];
  selling_price_usd: number;
  last_charged_fee_usd: number | null;
  fee_source: FeeSource;
  active: boolean;
};

function fromRow(row: ProductRow): Product {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sku: row.sku,
    asin: row.asin,
    title: row.title,
    lengthIn: Number(row.length_in),
    widthIn: Number(row.width_in),
    heightIn: Number(row.height_in),
    unitWeightOz: Number(row.unit_weight_oz),
    category: row.category,
    sellingPriceUsd: Number(row.selling_price_usd),
    lastChargedFeeUsd:
      row.last_charged_fee_usd == null
        ? null
        : Number(row.last_charged_fee_usd),
    feeSource: row.fee_source ?? 'manual',
    active: row.active,
    latestDetection: null,
  };
}

type LatestDetectionRow = {
  id: string;
  created_at: string;
  product_id: string;
  fee_date: string;
  season: LatestDetectionSummary['season'];
  source: LatestDetectionSummary['source'];
  length_in: number;
  width_in: number;
  height_in: number;
  unit_weight_oz: number;
  category: LatestDetectionSummary['category'];
  selling_price_usd: number;
  size_tier: LatestDetectionSummary['sizeTier'];
  shipping_weight_lb: number;
  shipping_weight_oz: number;
  dimensional_weight_lb: number;
  price_band: string;
  weight_band_label: string;
  expected_fee_usd: number;
  charged_fee_usd: number;
  difference_usd: number;
  verdict: LatestDetectionSummary['verdict'];
  explanation: string;
  implied_size_tier: LatestDetectionSummary['sizeTier'] | null;
  implied_weight_band_label: string | null;
  matched_fee_usd: number | null;
  fee_delta_from_charged: number | null;
};

function latestFromRow(row: LatestDetectionRow): LatestDetectionSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    feeDate: String(row.fee_date).slice(0, 10),
    season: row.season,
    source: row.source,
    lengthIn: Number(row.length_in),
    widthIn: Number(row.width_in),
    heightIn: Number(row.height_in),
    unitWeightOz: Number(row.unit_weight_oz),
    category: row.category,
    sellingPriceUsd: Number(row.selling_price_usd),
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
    impliedSizeTier: row.implied_size_tier,
    impliedWeightBandLabel: row.implied_weight_band_label,
    matchedFeeUsd:
      row.matched_fee_usd == null ? null : Number(row.matched_fee_usd),
    feeDeltaFromCharged:
      row.fee_delta_from_charged == null
        ? null
        : Number(row.fee_delta_from_charged),
  };
}

function toInsertRow(id: string, now: string, input: CreateProductInput): ProductRow {
  return {
    id,
    created_at: now,
    updated_at: now,
    sku: input.sku.trim(),
    asin: input.asin?.trim() || null,
    title: input.title?.trim() || null,
    length_in: input.lengthIn,
    width_in: input.widthIn,
    height_in: input.heightIn,
    unit_weight_oz: input.unitWeightOz,
    category: input.category,
    selling_price_usd: input.sellingPriceUsd,
    last_charged_fee_usd: input.lastChargedFeeUsd,
    fee_source: input.feeSource ?? 'manual',
    active: input.active ?? true,
  };
}

@Injectable()
export class ProductsRepository {
  private readonly logger = new Logger(ProductsRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async create(input: CreateProductInput): Promise<Product> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = toInsertRow(id, now, input);

    const { data, error } = await this.supabase.client
      .from('products')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new DbConflictError(`SKU already exists: ${row.sku}`);
      }
      this.logger.error(`Supabase product insert failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to save product: ${error.message}`,
      );
    }

    return fromRow(data as ProductRow);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.sku !== undefined) patch.sku = input.sku.trim();
    if (input.asin !== undefined) patch.asin = input.asin?.trim() || null;
    if (input.title !== undefined) patch.title = input.title?.trim() || null;
    if (input.lengthIn !== undefined) patch.length_in = input.lengthIn;
    if (input.widthIn !== undefined) patch.width_in = input.widthIn;
    if (input.heightIn !== undefined) patch.height_in = input.heightIn;
    if (input.unitWeightOz !== undefined) {
      patch.unit_weight_oz = input.unitWeightOz;
    }
    if (input.category !== undefined) patch.category = input.category;
    if (input.sellingPriceUsd !== undefined) {
      patch.selling_price_usd = input.sellingPriceUsd;
    }
    if (input.lastChargedFeeUsd !== undefined) {
      patch.last_charged_fee_usd = input.lastChargedFeeUsd;
    }
    if (input.feeSource !== undefined) patch.fee_source = input.feeSource;
    if (input.active !== undefined) patch.active = input.active;

    const { data, error } = await this.supabase.client
      .from('products')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        throw new DbConflictError(
          `SKU already exists: ${String(input.sku ?? '')}`,
        );
      }
      this.logger.error(`Supabase product update failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to update product: ${error.message}`,
      );
    }
    if (!data) throw new DbNotFoundError(`Product not found: ${id}`);
    return fromRow(data as ProductRow);
  }

  async delete(id: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('products')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      this.logger.error(`Supabase product delete failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to delete product: ${error.message}`,
      );
    }
    if (!data) throw new DbNotFoundError(`Product not found: ${id}`);
  }

  async findByIds(ids: string[]): Promise<Map<string, Product>> {
    const unique = [...new Set(ids.filter(Boolean))];
    const map = new Map<string, Product>();
    if (unique.length === 0) return map;

    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .in('id', unique);

    if (error) {
      this.logger.error(`Supabase product findByIds failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to load products: ${error.message}`,
      );
    }
    for (const row of data as ProductRow[]) {
      map.set(row.id, fromRow(row));
    }
    return map;
  }

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Supabase product find failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to load product: ${error.message}`,
      );
    }
    return data ? fromRow(data as ProductRow) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const normalized = sku.trim();
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .eq('sku', normalized)
      .maybeSingle();

    if (error) {
      this.logger.error(`Supabase product findBySku failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to load product: ${error.message}`,
      );
    }
    return data ? fromRow(data as ProductRow) : null;
  }

  async listPage(
    params: PageParams,
    opts: { verdict?: LatestDetectionSummary['verdict'] } = {},
  ): Promise<PageResult<Product>> {
    const { from, to } = pageRange(params);

    // Verdict filter needs latest detection → load all, filter, then page
    if (opts.verdict) {
      const { data, error } = await this.supabase.client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error(`Supabase product list failed: ${error.message}`);
        throw new ServiceUnavailableException(
          `Failed to list products: ${error.message}`,
        );
      }

      const products = (data as ProductRow[]).map(fromRow);
      const latestByProduct = await this.findLatestDetectionsByProductIds(
        products.map((p) => p.id),
      );
      const filtered = products.filter(
        (p) => latestByProduct.get(p.id)?.verdict === opts.verdict,
      );
      const pageItems = filtered.slice(from, to + 1);

      return {
        items: pageItems.map((p) => ({
          ...p,
          latestDetection: latestByProduct.get(p.id) ?? null,
        })),
        total: filtered.length,
        page: params.page,
        pageSize: params.pageSize,
      };
    }

    const { data, error, count } = await this.supabase.client
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error(`Supabase product list failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to list products: ${error.message}`,
      );
    }

    const products = (data as ProductRow[]).map(fromRow);
    const latestByProduct = await this.findLatestDetectionsByProductIds(
      products.map((p) => p.id),
    );

    return {
      items: products.map((p) => ({
        ...p,
        latestDetection: latestByProduct.get(p.id) ?? null,
      })),
      total: count ?? 0,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  private async findLatestDetectionsByProductIds(
    productIds: string[],
  ): Promise<Map<string, LatestDetectionSummary>> {
    const map = new Map<string, LatestDetectionSummary>();
    if (productIds.length === 0) return map;

    const { data, error } = await this.supabase.client
      .from('detections')
      .select('*')
      .in('product_id', productIds)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(
        `Supabase latest detections lookup failed: ${error.message}`,
      );
      throw new ServiceUnavailableException(
        `Failed to load latest detections: ${error.message}`,
      );
    }

    for (const row of data as LatestDetectionRow[]) {
      if (!row.product_id || map.has(row.product_id)) continue;
      map.set(row.product_id, latestFromRow(row));
    }
    return map;
  }

  async listActive(): Promise<Product[]> {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sku', { ascending: true });

    if (error) {
      this.logger.error(`Supabase listActive failed: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to list active products: ${error.message}`,
      );
    }
    return (data as ProductRow[]).map(fromRow);
  }
}
