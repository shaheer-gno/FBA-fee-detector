/**
 * Shared Amazon report kind detection (API + web).
 * Header-based only — filenames are ignored.
 */

export type AmazonReportType =
  | 'fee_preview'
  | 'settlement_v2'
  | 'merchant_listings'
  | 'fba_myi'
  | 'orders'
  | 'unknown';

export const REPORT_LABELS: Record<AmazonReportType, string> = {
  fee_preview: 'FBA Fee Preview',
  settlement_v2: 'Settlement V2',
  merchant_listings: 'Merchant Listings',
  fba_myi: 'FBA Inventory (MYI)',
  orders: 'All Orders',
  unknown: 'Unknown',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/_/g, '-');
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function headerIndex(text: string): Map<string, number> | null {
  const first = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .find((l) => l.trim().length > 0);
  if (!first) return null;
  const headers = (
    first.includes('\t') ? first.split('\t') : splitCsvLine(first)
  ).map(normalizeHeader);
  return new Map(headers.map((h, i) => [h, i]));
}

function hasCols(index: Map<string, number>, ...names: string[]): boolean {
  return names.every((n) => index.has(normalizeHeader(n)));
}

export function detectAmazonReportType(text: string): AmazonReportType {
  const index = headerIndex(text);
  if (!index) return 'unknown';

  if (
    hasCols(index, 'sku', 'longest-side', 'item-package-weight') &&
    (index.has('expected-fulfillment-fee-per-unit') ||
      index.has('expected-future-fulfillment-fee-per-unit'))
  ) {
    return 'fee_preview';
  }

  if (
    hasCols(index, 'settlement-id', 'amount-type', 'amount-description', 'amount')
  ) {
    return 'settlement_v2';
  }

  if (
    hasCols(index, 'seller-sku') &&
    (index.has('fulfillment-channel') || index.has('asin1'))
  ) {
    return 'merchant_listings';
  }

  if (
    hasCols(index, 'sku', 'afn-fulfillable-quantity') ||
    hasCols(index, 'sku', 'afn-warehouse-quantity')
  ) {
    return 'fba_myi';
  }

  if (hasCols(index, 'amazon-order-id', 'sku') && index.has('purchase-date')) {
    return 'orders';
  }

  return 'unknown';
}
