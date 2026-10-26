import { col, headerIndex, parseNumber, splitLine } from './tsv';

export type FbaMyiRow = {
  sku: string;
  asin: string | null;
  title: string | null;
  priceUsd: number | null;
  afnTotalQty: number;
};

export type FbaMyiParseResult = {
  rows: FbaMyiRow[];
  issues: { line: number; sku?: string; reason: string }[];
};

export function parseFbaMyiText(text: string): FbaMyiParseResult {
  const parsed = headerIndex(text);
  if (!parsed || parsed.lines.length < 2) {
    return {
      rows: [],
      issues: [{ line: 1, reason: 'Empty FBA inventory file' }],
    };
  }

  const { lines, index } = parsed;
  if (!index.has('sku')) {
    return {
      rows: [],
      issues: [{ line: 1, reason: 'Missing sku (is this FBA MYI inventory?)' }],
    };
  }

  const rows: FbaMyiRow[] = [];
  const issues: FbaMyiParseResult['issues'] = [];

  for (let li = 1; li < lines.length; li++) {
    const lineNo = li + 1;
    const cells = splitLine(lines[li]!);
    const sku = col(cells, index, 'sku')?.trim() ?? '';
    if (!sku) {
      issues.push({ line: lineNo, reason: 'Empty SKU' });
      continue;
    }

    const total =
      parseNumber(col(cells, index, 'afn-total-quantity')) ??
      parseNumber(col(cells, index, 'afn-warehouse-quantity')) ??
      0;

    rows.push({
      sku,
      asin: col(cells, index, 'asin')?.trim() || null,
      title: col(cells, index, 'product-name')?.trim() || null,
      priceUsd: parseNumber(col(cells, index, 'your-price')),
      afnTotalQty: total,
    });
  }

  return { rows, issues };
}
