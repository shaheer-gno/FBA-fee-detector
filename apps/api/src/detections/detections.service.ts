import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { DetectProductDto } from '../products/dto/detect-product.dto';
import type { Product } from '../products/product.types';
import { ProductsRepository } from '../products/products.repository';
import { AnalyzeDetectionDto } from './dto/analyze-detection.dto';
import { RunDailyDto } from './dto/run-daily.dto';
import {
  parsePageParams,
  type PageResult,
} from '../common/pagination';
import {
  DetectionsRepository,
  type DetectionRecord,
  type DetectionSource,
} from './detections.repository';
import { FeeCalculationService } from './fee/fee-calculation.service';
import { FeeSettingsService } from './fee/fee-settings.service';
import { seasonFromFeeDate } from './fee/season-from-date';
import type { FeeRateCardSnapshot } from './fee/settings.types';
import type { AnalyzeInput, AnalyzeResult } from './fee/types';

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type DetectionResponse = AnalyzeResult & {
  id: string;
  createdAt: string;
  feeDate: string;
  season: AnalyzeInput['season'];
  productId: string | null;
  source: DetectionSource;
};

@Injectable()
export class DetectionsService {
  constructor(
    private readonly feeCalculation: FeeCalculationService,
    private readonly feeSettings: FeeSettingsService,
    private readonly repo: DetectionsRepository,
    @Inject(forwardRef(() => ProductsRepository))
    private readonly products: ProductsRepository,
  ) {}

  async analyze(dto: AnalyzeDetectionDto): Promise<DetectionResponse> {
    return this.runAndSave({
      lengthIn: dto.lengthIn,
      widthIn: dto.widthIn,
      heightIn: dto.heightIn,
      unitWeightOz: dto.unitWeightOz,
      category: dto.category,
      sellingPriceUsd: dto.sellingPriceUsd,
      feeDate: dto.feeDate,
      chargedFeeUsd: dto.chargedFeeUsd,
      productId: null,
      source: 'manual',
    });
  }

  async detectProduct(
    productId: string,
    dto: DetectProductDto,
  ): Promise<DetectionResponse> {
    const product = await this.products.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product not found: ${productId}`);
    }
    return this.detectFromProduct(product, dto, 'product');
  }

  async runDaily(dto: RunDailyDto) {
    const feeDate = dto.feeDate ?? todayUtcIso();
    let card: FeeRateCardSnapshot;
    let season: AnalyzeInput['season'];
    try {
      // Load once for the whole batch — same snapshot for every SKU.
      card = this.feeSettings.getCardForDate(feeDate);
      season = seasonFromFeeDate(feeDate, card.seasonWindows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid feeDate';
      throw new BadRequestException(message);
    }

    const charges = dto.charges ?? [];
    for (const charge of charges) {
      if (!charge.productId && !charge.sku) {
        throw new BadRequestException(
          'Each charge needs productId or sku',
        );
      }
    }

    const active = await this.products.listActive();
    const byId = new Map(active.map((p) => [p.id, p]));
    const bySku = new Map(active.map((p) => [p.sku, p]));

    const chargeByProductId = new Map<string, number>();
    for (const charge of charges) {
      let product: Product | undefined;
      if (charge.productId) {
        product = byId.get(charge.productId);
        if (!product) {
          const loaded = await this.products.findById(charge.productId);
          if (!loaded) {
            throw new NotFoundException(
              `Product not found: ${charge.productId}`,
            );
          }
          if (!loaded.active) continue;
          product = loaded;
        }
      } else if (charge.sku) {
        product = bySku.get(charge.sku);
        if (!product) {
          const loaded = await this.products.findBySku(charge.sku);
          if (!loaded) {
            throw new NotFoundException(`Product not found for sku: ${charge.sku}`);
          }
          if (!loaded.active) continue;
          product = loaded;
        }
      }
      if (product) {
        chargeByProductId.set(product.id, charge.chargedFeeUsd);
      }
    }

    return this.runBatch({
      products: active,
      feeDate,
      season,
      card,
      chargeByProductId,
    });
  }

  /**
   * Run detect for a specific set of products (e.g. after Amazon report import).
   */
  async runForProductIds(args: {
    productIds: string[];
    feeDate?: string;
  }) {
    const feeDate = args.feeDate ?? todayUtcIso();
    let card: FeeRateCardSnapshot;
    let season: AnalyzeInput['season'];
    try {
      card = this.feeSettings.getCardForDate(feeDate);
      season = seasonFromFeeDate(feeDate, card.seasonWindows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid feeDate';
      throw new BadRequestException(message);
    }

    const uniqueIds = [...new Set(args.productIds)];
    const products: Product[] = [];
    for (const id of uniqueIds) {
      const p = await this.products.findById(id);
      if (p) products.push(p);
    }

    return this.runBatch({
      products,
      feeDate,
      season,
      card,
      chargeByProductId: new Map(),
    });
  }

  private async runBatch(args: {
    products: Product[];
    feeDate: string;
    season: AnalyzeInput['season'];
    card: FeeRateCardSnapshot;
    chargeByProductId: Map<string, number>;
  }) {
    const ran: DetectionResponse[] = [];
    const skipped: {
      productId: string;
      sku: string;
      reason: 'no_charged_fee';
    }[] = [];

    for (const product of args.products) {
      const charged =
        args.chargeByProductId.get(product.id) ??
        product.lastChargedFeeUsd ??
        undefined;
      if (charged === undefined || charged === null) {
        skipped.push({
          productId: product.id,
          sku: product.sku,
          reason: 'no_charged_fee',
        });
        continue;
      }
      const result = await this.detectFromProduct(
        product,
        { chargedFeeUsd: charged, feeDate: args.feeDate },
        'daily_job',
        args.card,
      );
      ran.push(result);
    }

    return {
      feeDate: args.feeDate,
      season: args.season,
      ran,
      skipped,
      rateCardId: args.card.id,
    };
  }

  async listPage(
    page?: string,
    pageSize?: string,
    productId?: string,
    verdict?: string,
  ): Promise<PageResult<DetectionRecord>> {
    const params = parsePageParams(page, pageSize);
    const allowed = ['correct', 'overcharged', 'undercharged'] as const;
    const v = allowed.includes(verdict as (typeof allowed)[number])
      ? (verdict as (typeof allowed)[number])
      : undefined;
    const result = await this.repo.listPage(params, {
      productId,
      verdict: v,
    });
    const productIds = result.items
      .map((r) => r.productId)
      .filter((id): id is string => !!id);
    const products = await this.products.findByIds(productIds);

    return {
      ...result,
      items: result.items.map((row) => {
        if (!row.productId) return row;
        const product = products.get(row.productId);
        if (!product) return row;
        return {
          ...row,
          productSku: product.sku,
          productAsin: product.asin,
          productTitle: product.title,
        };
      }),
    };
  }

  private async detectFromProduct(
    product: Product,
    dto: DetectProductDto,
    source: DetectionSource,
    card?: FeeRateCardSnapshot,
  ): Promise<DetectionResponse> {
    const response = await this.runAndSave({
      lengthIn: product.lengthIn,
      widthIn: product.widthIn,
      heightIn: product.heightIn,
      unitWeightOz: product.unitWeightOz,
      category: product.category,
      sellingPriceUsd: dto.sellingPriceUsd ?? product.sellingPriceUsd,
      feeDate: dto.feeDate ?? todayUtcIso(),
      chargedFeeUsd: dto.chargedFeeUsd,
      productId: product.id,
      source,
      card,
    });

    await this.products.update(product.id, {
      lastChargedFeeUsd: dto.chargedFeeUsd,
    });

    return response;
  }

  private async runAndSave(args: {
    lengthIn: number;
    widthIn: number;
    heightIn: number;
    unitWeightOz: number;
    category: AnalyzeInput['category'];
    sellingPriceUsd: number;
    feeDate: string;
    chargedFeeUsd: number;
    productId: string | null;
    source: DetectionSource;
    /** Pre-loaded card (daily batch). When omitted, resolve once for this call. */
    card?: FeeRateCardSnapshot;
  }): Promise<DetectionResponse> {
    let card: FeeRateCardSnapshot;
    let season: AnalyzeInput['season'];
    try {
      card = args.card ?? this.feeSettings.getCardForDate(args.feeDate);
      season = seasonFromFeeDate(args.feeDate, card.seasonWindows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid feeDate';
      throw new BadRequestException(message);
    }

    const input: AnalyzeInput = {
      lengthIn: args.lengthIn,
      widthIn: args.widthIn,
      heightIn: args.heightIn,
      unitWeightOz: args.unitWeightOz,
      category: args.category,
      sellingPriceUsd: args.sellingPriceUsd,
      feeDate: args.feeDate,
      season,
      chargedFeeUsd: args.chargedFeeUsd,
    };

    try {
      const result = this.feeCalculation.analyze(input, card);
      const saved = await this.repo.save(input, result, {
        productId: args.productId,
        source: args.source,
        runDate: args.feeDate,
      });
      return {
        id: saved.id,
        createdAt: saved.createdAt,
        feeDate: input.feeDate,
        season: input.season,
        productId: saved.productId,
        source: saved.source,
        ...result,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'Analyze failed';
      throw new BadRequestException(message);
    }
  }
}
