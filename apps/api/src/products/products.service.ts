import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { DbConflictError, DbNotFoundError } from '../common/db-errors';
import {
  parsePageParams,
  type PageResult,
} from '../common/pagination';
import { DetectionsService } from '../detections/detections.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ImportAmazonReportsDto } from './dto/import-amazon-reports.dto';
import { ImportFeePreviewDto } from './dto/import-fee-preview.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { parseFeePreviewText } from './fee-preview/parse-fee-preview';
import type {
  AmazonReportsImportResult,
  FeePreviewImportResult,
  Product,
} from './product.types';
import { detectAmazonReportType } from './reports/detect-report';
import { parseMerchantListingsText } from './reports/parse-merchant-listings';
import { parseSettlementV2Text } from './reports/parse-settlement';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    @Inject(forwardRef(() => DetectionsService))
    private readonly detections: DetectionsService,
  ) {}

  async create(dto: CreateProductDto) {
    try {
      return await this.repo.create({ ...dto, feeSource: 'manual' });
    } catch (err) {
      this.rethrowAsHttp(err);
    }
  }

  async get(id: string) {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException(`Product not found: ${id}`);
    return product;
  }

  listPage(
    page?: string,
    pageSize?: string,
    verdict?: string,
  ): Promise<PageResult<Product>> {
    const allowed = ['correct', 'overcharged', 'undercharged'] as const;
    const v = allowed.includes(verdict as (typeof allowed)[number])
      ? (verdict as (typeof allowed)[number])
      : undefined;
    return this.repo.listPage(parsePageParams(page, pageSize), { verdict: v });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Product not found: ${id}`);

    if (
      (existing.feeSource === 'fee_preview' ||
        existing.feeSource === 'settlement') &&
      dto.lastChargedFeeUsd !== undefined &&
      dto.lastChargedFeeUsd !== existing.lastChargedFeeUsd
    ) {
      throw new BadRequestException(
        existing.feeSource === 'settlement'
          ? 'Amazon fee from Settlement is locked. Re-import settlement reports to update it.'
          : 'Amazon fee from Fee Preview is locked. Re-import reports to update it.',
      );
    }

    try {
      return await this.repo.update(id, dto);
    } catch (err) {
      this.rethrowAsHttp(err);
    }
  }

  async remove(id: string) {
    try {
      await this.repo.delete(id);
    } catch (err) {
      this.rethrowAsHttp(err);
    }
    return { ok: true };
  }

  private rethrowAsHttp(err: unknown): never {
    if (err instanceof DbConflictError) {
      throw new ConflictException(err.message);
    }
    if (err instanceof DbNotFoundError) {
      throw new NotFoundException(err.message);
    }
    throw err;
  }

  /**
   * Upsert products from FBA Fee Preview file text
   * (GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA / Seller Central export).
   */
  async importFeePreview(dto: ImportFeePreviewDto): Promise<FeePreviewImportResult> {
    const result = await this.applyFeePreview(dto.text);
    return {
      created: result.created,
      updated: result.updated,
      skipped: result.issues.length,
      issues: result.issues.slice(0, 100),
      productIds: result.changedProductIds,
    };
  }

  /**
   * Multi-report import: Fee Preview → Merchant enrich → Settlement charged fees.
   */
  async importAmazonReports(
    dto: ImportAmazonReportsDto,
  ): Promise<AmazonReportsImportResult> {
    const detected: AmazonReportsImportResult['detected'] = [];
    const issues: AmazonReportsImportResult['issues'] = [];
    const productIds = new Set<string>();

    const feePreviewFiles: { name: string; text: string }[] = [];
    const settlementFiles: { name: string; text: string }[] = [];
    const merchantFiles: { name: string; text: string }[] = [];

    for (const file of dto.files) {
      const type = detectAmazonReportType(file.text);
      detected.push({ name: file.name, type });
      if (type === 'fee_preview') feePreviewFiles.push(file);
      else if (type === 'settlement_v2') settlementFiles.push(file);
      else if (type === 'merchant_listings') merchantFiles.push(file);
      else if (type === 'fba_myi' || type === 'orders') {
        issues.push({
          file: file.name,
          line: 1,
          reason: `${type === 'orders' ? 'Orders' : 'FBA inventory'} reports are not imported`,
        });
      } else {
        issues.push({
          file: file.name,
          line: 1,
          reason: 'Unrecognized report type (check header columns)',
        });
      }
    }

    const missing: string[] = [];
    if (feePreviewFiles.length === 0) missing.push('Fee Preview');
    if (settlementFiles.length === 0) missing.push('Settlement V2');
    if (merchantFiles.length === 0) missing.push('Merchant listings');
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required report(s): ${missing.join(', ')}`,
      );
    }

    let feePreview = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
    for (const file of feePreviewFiles) {
      const r = await this.applyFeePreview(file.text);
      feePreview.created += r.created;
      feePreview.updated += r.updated;
      feePreview.unchanged += r.unchanged;
      feePreview.skipped += r.issues.length;
      r.changedProductIds.forEach((id) => productIds.add(id));
      for (const issue of r.issues) {
        issues.push({ ...issue, file: file.name });
      }
    }

    let merchant = { enriched: 0, unchanged: 0, skipped: 0 };
    for (const file of merchantFiles) {
      const r = await this.applyMerchant(file.text);
      merchant.enriched += r.enriched;
      merchant.unchanged += r.unchanged;
      merchant.skipped += r.skipped;
      for (const issue of r.issues) {
        issues.push({ ...issue, file: file.name });
      }
    }

    const myi = { enriched: 0, unchanged: 0, skipped: 0 };

    let settlement = {
      skusUpdated: 0,
      unchanged: 0,
      chargeRows: 0,
      skipped: 0,
    };
    // Merge latest-by-sku across all settlement files
    const latestCharges = new Map<
      string,
      { unitFeeUsd: number; postedAt: string | null }
    >();
    for (const file of settlementFiles) {
      const parsed = parseSettlementV2Text(file.text);
      settlement.chargeRows += parsed.charges.length;
      for (const issue of parsed.issues) {
        // Don't flood with every MX skip — keep a sample
        if (issues.length < 200) {
          issues.push({ ...issue, file: file.name });
        }
      }
      settlement.skipped += parsed.issues.length;
      for (const [sku, charge] of parsed.latestBySku) {
        const prev = latestCharges.get(sku);
        if (
          !prev ||
          (charge.postedAt && (!prev.postedAt || charge.postedAt > prev.postedAt))
        ) {
          latestCharges.set(sku, {
            unitFeeUsd: charge.unitFeeUsd,
            postedAt: charge.postedAt,
          });
        }
      }
    }

    for (const [sku, charge] of latestCharges) {
      const existing = await this.repo.findBySku(sku);
      if (!existing) {
        issues.push({
          line: 0,
          sku,
          reason: 'Settlement fee SKU not in catalog (import Fee Preview first)',
        });
        settlement.skipped += 1;
        continue;
      }
      const feeSame =
        existing.feeSource === 'settlement' &&
        existing.lastChargedFeeUsd != null &&
        nearlyEqual(existing.lastChargedFeeUsd, charge.unitFeeUsd);
      if (feeSame) {
        settlement.unchanged += 1;
        continue;
      }
      try {
        const product = await this.repo.update(existing.id, {
          lastChargedFeeUsd: charge.unitFeeUsd,
          feeSource: 'settlement',
        });
        productIds.add(product.id);
        settlement.skusUpdated += 1;
      } catch (err) {
        issues.push({
          line: 0,
          sku,
          reason: err instanceof Error ? err.message : 'Settlement update failed',
        });
        settlement.skipped += 1;
      }
    }

    const ids = [...productIds];
    let detect = { ran: 0, skipped: 0, feeDate: dto.feeDate ?? '' };
    if (ids.length > 0) {
      const batch = await this.detections.runForProductIds({
        productIds: ids,
        feeDate: dto.feeDate,
      });
      detect = {
        ran: batch.ran.length,
        skipped: batch.skipped.length,
        feeDate: batch.feeDate,
      };
    }

    return {
      detected,
      feePreview,
      settlement,
      merchant,
      myi,
      orders: {
        noted: 0,
        message: 'Orders reports are not imported.',
      },
      detect,
      issues: issues.slice(0, 100),
      productIds: ids,
    };
  }

  private async applyFeePreview(text: string): Promise<{
    created: number;
    updated: number;
    unchanged: number;
    issues: { line: number; sku?: string; reason: string }[];
    changedProductIds: string[];
  }> {
    const parsed = parseFeePreviewText(text);

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    const changedProductIds: string[] = [];
    const issues = [...parsed.issues];

    for (const row of parsed.rows) {
      try {
        const existing = await this.repo.findBySku(row.sku);
        const base = {
          sku: row.sku,
          asin: row.asin,
          title: row.title,
          lengthIn: row.lengthIn,
          widthIn: row.widthIn,
          heightIn: row.heightIn,
          unitWeightOz: row.unitWeightOz,
          category: 'general' as const,
          sellingPriceUsd: row.sellingPriceUsd,
          active: true,
        };

        if (existing) {
          // Don't overwrite real settlement charged fee with Fee Preview estimate
          const keepSettlement = existing.feeSource === 'settlement';
          const dimsSame =
            nearlyEqual(existing.lengthIn, row.lengthIn) &&
            nearlyEqual(existing.widthIn, row.widthIn) &&
            nearlyEqual(existing.heightIn, row.heightIn) &&
            nearlyEqual(existing.unitWeightOz, row.unitWeightOz);
          const metaSame =
            (existing.asin ?? null) === (row.asin ?? null) &&
            (existing.title ?? null) === (row.title ?? null) &&
            nearlyEqual(existing.sellingPriceUsd, row.sellingPriceUsd) &&
            existing.active === true;
          const feeSame =
            keepSettlement ||
            (existing.feeSource === 'fee_preview' &&
              existing.lastChargedFeeUsd != null &&
              nearlyEqual(
                existing.lastChargedFeeUsd,
                row.expectedFulfillmentFeeUsd,
              ));

          if (dimsSame && metaSame && feeSame) {
            unchanged += 1;
            continue;
          }

          const product = await this.repo.update(existing.id, {
            ...base,
            ...(keepSettlement
              ? {}
              : {
                  lastChargedFeeUsd: row.expectedFulfillmentFeeUsd,
                  feeSource: 'fee_preview' as const,
                }),
          });
          changedProductIds.push(product.id);
          updated += 1;
        } else {
          const product = await this.repo.create({
            ...base,
            lastChargedFeeUsd: row.expectedFulfillmentFeeUsd,
            feeSource: 'fee_preview',
          });
          changedProductIds.push(product.id);
          created += 1;
        }
      } catch (err) {
        issues.push({
          line: 0,
          sku: row.sku,
          reason: err instanceof Error ? err.message : 'Import failed',
        });
      }
    }

    return { created, updated, unchanged, issues, changedProductIds };
  }

  private async applyMerchant(text: string): Promise<{
    enriched: number;
    unchanged: number;
    skipped: number;
    issues: { line: number; sku?: string; reason: string }[];
  }> {
    const parsed = parseMerchantListingsText(text);
    let enriched = 0;
    let unchanged = 0;
    let skipped = 0;
    const issues = [...parsed.issues];

    for (const row of parsed.rows) {
      const existing = await this.repo.findBySku(row.sku);
      if (!existing) {
        skipped += 1;
        continue;
      }
      const nextTitle = row.title ?? existing.title;
      const nextAsin = row.asin ?? existing.asin;
      const nextPrice =
        row.priceUsd != null && row.priceUsd > 0
          ? row.priceUsd
          : existing.sellingPriceUsd;
      if (
        (existing.title ?? null) === (nextTitle ?? null) &&
        (existing.asin ?? null) === (nextAsin ?? null) &&
        existing.active === row.active &&
        nearlyEqual(existing.sellingPriceUsd, nextPrice)
      ) {
        unchanged += 1;
        continue;
      }
      try {
        await this.repo.update(existing.id, {
          title: nextTitle,
          asin: nextAsin,
          active: row.active,
          sellingPriceUsd: nextPrice,
        });
        enriched += 1;
      } catch (err) {
        issues.push({
          line: 0,
          sku: row.sku,
          reason: err instanceof Error ? err.message : 'Merchant enrich failed',
        });
        skipped += 1;
      }
    }

    return { enriched, unchanged, skipped, issues };
  }
}

function nearlyEqual(a: number, b: number, eps = 0.005): boolean {
  return Math.abs(a - b) <= eps;
}
