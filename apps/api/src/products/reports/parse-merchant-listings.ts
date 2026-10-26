import { col, headerIndex, parseNumber, splitLine } from './tsv';

export type MerchantListingRow = {
  sku: string;
  asin: string | null;
  title: string | null;
  priceUsd: number | null;
  active: boolean;
  fulfillmentChannel: string | null;
};

export type MerchantListingsParseResult = {
  rows: MerchantListingRow[];
  issues: { line: number; sku?: string; reason: string }[];
};

export function parseMerchantListingsText(
  text: string,
): MerchantListingsParseResult {
  const parsed = headerIndex(text);
  if (!parsed || parsed.lines.length < 2) {
    return {
      rows: [],
      issues: [{ line: 1, reason: 'Empty merchant listings file' }],
    };
  }

  const { lines, index } = parsed;
  if (!index.has('seller-sku')) {
    return {
      rows: [],
      issues: [
        { line: 1, reason: 'Missing seller-sku (is this Merchant Listings?)' },
      ],
    };
  }

  const rows: MerchantListingRow[] = [];
  const issues: MerchantListingsParseResult['issues'] = [];

  for (let li = 1; li < lines.length; li++) {
    const lineNo = li + 1;
    const cells = splitLine(lines[li]!);
    const sku = col(cells, index, 'seller-sku')?.trim() ?? '';
    if (!sku) {
      issues.push({ line: lineNo, reason: 'Empty seller-sku' });
      continue;
    }

    const status = (col(cells, index, 'status') ?? '').trim().toLowerCase();
    const channel = col(cells, index, 'fulfillment-channel')?.trim() || null;

    rows.push({
      sku,
      asin:
        col(cells, index, 'asin1', 'product-id')?.trim() || null,
      title: col(cells, index, 'item-name')?.trim() || null,
      priceUsd: parseNumber(col(cells, index, 'price')),
      active: status === 'active',
      fulfillmentChannel: channel,
    });
  }

  return { rows, issues };
}
