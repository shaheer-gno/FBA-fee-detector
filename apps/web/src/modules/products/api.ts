import { apiRequest, pageQuery } from '../../shared/api/client';
import type { AnalyzeResponse, PageResult } from '../../shared/api/types';
import { LIST_PAGE_SIZE } from '../../shared/constants';
import type {
  AmazonReportsImportResult,
  CreateProductPayload,
  FeePreviewImportResult,
  Product,
  RunDailyResponse,
} from './types';

export function listProducts(
  page = 1,
  pageSize = LIST_PAGE_SIZE,
  verdict?: string,
): Promise<PageResult<Product>> {
  const extra = verdict
    ? `verdict=${encodeURIComponent(verdict)}`
    : undefined;
  return apiRequest<PageResult<Product>>(
    `/products${pageQuery(page, pageSize, extra)}`,
  );
}

export function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  return apiRequest<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProduct(
  id: string,
  payload: Partial<CreateProductPayload>,
): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' });
}

export function detectProduct(
  id: string,
  payload: {
    chargedFeeUsd: number;
    feeDate?: string;
    sellingPriceUsd?: number;
  },
): Promise<AnalyzeResponse> {
  return apiRequest<AnalyzeResponse>(`/products/${id}/detect`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function runDaily(payload: {
  feeDate?: string;
  charges?: { productId?: string; sku?: string; chargedFeeUsd: number }[];
}): Promise<RunDailyResponse> {
  return apiRequest<RunDailyResponse>('/detections/run-daily', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Upload Seller Central / SP-API Fee Preview file text. */
export function importFeePreview(text: string): Promise<FeePreviewImportResult> {
  return apiRequest<FeePreviewImportResult>('/products/import/fee-preview', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/** Multi-report import (Fee Preview, Settlement, Merchant, MYI). */
export function importAmazonReports(
  files: { name: string; text: string }[],
  feeDate?: string,
): Promise<AmazonReportsImportResult> {
  return apiRequest<AmazonReportsImportResult>(
    '/products/import/amazon-reports',
    {
      method: 'POST',
      body: JSON.stringify({ files, feeDate }),
    },
  );
}
