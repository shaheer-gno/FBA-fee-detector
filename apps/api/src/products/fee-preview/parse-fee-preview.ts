/**
 * Parser for Amazon FBA Fee Preview flat file
 * (SP-API reportType: GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA).
 *
 * Seller Central downloads are typically tab-delimited with a header row.
 * Dims/weight on this report are Amazon’s recorded package values;
 * expected-fulfillment-fee-per-unit is Amazon’s estimated FBA fee.
 *
 * v1 keeps US marketplace rows only (rate card is US 2026).
 */

import {
  col,
  headerIndex,
  normalizeHeader,
  parseNumber,
  splitLine,
} from '../reports/tsv';

export type FeePreviewRow = {
  sku: string;
  asin: string | null;
  title: string | null;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  unitWeightOz: number;
  sellingPriceUsd: number;
  /** Amazon estimated fulfillment fee (locked as charged fee on import). */
  expectedFulfillmentFeeUsd: number;
  sizeTierLabel: string | null;
  amazonStore: string | null;
};

export type FeePreviewParseIssue = {
  line: number;
  sku?: string;
  reason: string;
};

export type FeePreviewParseResult = {
  rows: FeePreviewRow[];
  issues: FeePreviewParseIssue[];
};

function weightToOz(value: number, unitRaw: string | undefined): number | null {
  const u = (unitRaw ?? 'pounds').trim().toLowerCase();
  if (u.startsWith('oz') || u.includes('ounce')) return value;
  if (u.startsWith('lb') || u.includes('pound') || u === 'lbs') return value * 16;
  if (u.startsWith('kg') || u.includes('kilogram')) return value * 35.2739619;
  if (u.startsWith('g') && !u.startsWith('gal')) return value * 0.0352739619;
  return value * 16;
}

function dimToInches(value: number, unitRaw: string | undefined): number | null {
  const u = (unitRaw ?? 'inches').trim().toLowerCase();
  if (u.startsWith('in') || u.includes('inch')) return value;
  if (u.startsWith('cm') || u.includes('centimeter')) return value / 2.54;
  if (u === 'm' || u.startsWith('meter')) return value * 39.3700787;
  return value;
}

/** US store labels seen on Fee Preview exports. */
export function isUsAmazonStore(store: string | null | undefined): boolean {
  if (store == null || !store.trim()) return true; // assume US if omitted
  const s = store.trim().toLowerCase();
  return (
    s === 'us' ||
    s === 'amazon.com' ||
    s.includes('amazon.com') ||
    s === 'atvpdikx0der'
  );
}

/**
 * Parse Fee Preview file text into product-ready rows.
 * Skips non-FBA and non-US rows.
 */
export function parseFeePreviewText(text: string): FeePreviewParseResult {
  const parsed = headerIndex(text);
  if (!parsed || parsed.lines.length < 2) {
    return {
      rows: [],
      issues: [{ line: 1, reason: 'File needs a header row and at least one data row' }],
    };
  }

  const { lines, index } = parsed;

  const required = [
    'sku',
    'longest-side',
    'median-side',
    'shortest-side',
    'item-package-weight',
  ];
  for (const r of required) {
    if (!index.has(r)) {
      return {
        rows: [],
        issues: [
          {
            line: 1,
            reason: `Missing required column "${r}" (is this an FBA Fee Preview export?)`,
          },
        ],
      };
    }
  }

  const feeColPresent =
    index.has('expected-fulfillment-fee-per-unit') ||
    index.has('expected-future-fulfillment-fee-per-unit');
  if (!feeColPresent) {
    return {
      rows: [],
      issues: [
        {
          line: 1,
          reason:
            'Missing expected-fulfillment-fee-per-unit (US Fee Preview column)',
        },
      ],
    };
  }

  const rows: FeePreviewRow[] = [];
  const issues: FeePreviewParseIssue[] = [];

  for (let li = 1; li < lines.length; li++) {
    const lineNo = li + 1;
    const cells = splitLine(lines[li]!);
    const sku = col(cells, index, 'sku')?.trim() ?? '';
    if (!sku) {
      issues.push({ line: lineNo, reason: 'Empty SKU' });
      continue;
    }

    const amazonStore = col(cells, index, 'amazon-store')?.trim() || null;
    if (!isUsAmazonStore(amazonStore)) {
      issues.push({
        line: lineNo,
        sku,
        reason: `Skipped non-US store "${amazonStore}"`,
      });
      continue;
    }

    const fulfilled = col(cells, index, 'fulfilled-by')?.trim().toLowerCase();
    if (
      fulfilled &&
      !fulfilled.includes('amazon') &&
      fulfilled !== 'afn' &&
      fulfilled !== 'fba'
    ) {
      issues.push({
        line: lineNo,
        sku,
        reason: `Skipped non-FBA fulfilled-by="${fulfilled}"`,
      });
      continue;
    }

    const longest = parseNumber(col(cells, index, 'longest-side'));
    const median = parseNumber(col(cells, index, 'median-side'));
    const shortest = parseNumber(col(cells, index, 'shortest-side'));
    const dimUnit = col(cells, index, 'unit-of-dimension');
    const weight = parseNumber(col(cells, index, 'item-package-weight'));
    const weightUnit = col(cells, index, 'unit-of-weight');
    const price =
      parseNumber(col(cells, index, 'your-price')) ??
      parseNumber(col(cells, index, 'sales-price'));
    const fee =
      parseNumber(col(cells, index, 'expected-fulfillment-fee-per-unit')) ??
      parseNumber(col(cells, index, 'expected-future-fulfillment-fee-per-unit'));

    if (longest == null || median == null || shortest == null) {
      issues.push({ line: lineNo, sku, reason: 'Invalid dimensions' });
      continue;
    }
    if (weight == null) {
      issues.push({ line: lineNo, sku, reason: 'Invalid package weight' });
      continue;
    }
    if (price == null || price < 0) {
      issues.push({ line: lineNo, sku, reason: 'Invalid your-price / sales-price' });
      continue;
    }
    if (fee == null || fee < 0) {
      issues.push({
        line: lineNo,
        sku,
        reason: 'Invalid expected-fulfillment-fee-per-unit',
      });
      continue;
    }

    const lengthIn = dimToInches(longest, dimUnit);
    const widthIn = dimToInches(median, dimUnit);
    const heightIn = dimToInches(shortest, dimUnit);
    const unitWeightOz = weightToOz(weight, weightUnit);

    if (
      lengthIn == null ||
      widthIn == null ||
      heightIn == null ||
      unitWeightOz == null ||
      lengthIn <= 0 ||
      widthIn <= 0 ||
      heightIn <= 0 ||
      unitWeightOz <= 0
    ) {
      issues.push({ line: lineNo, sku, reason: 'Dims/weight must be positive' });
      continue;
    }

    rows.push({
      sku,
      asin: col(cells, index, 'asin')?.trim() || null,
      title: col(cells, index, 'product-name')?.trim() || null,
      lengthIn,
      widthIn,
      heightIn,
      unitWeightOz,
      sellingPriceUsd: price,
      expectedFulfillmentFeeUsd: fee,
      sizeTierLabel: col(cells, index, 'product-size-tier')?.trim() || null,
      amazonStore,
    });
  }

  return { rows, issues };
}

/** @deprecated keep export for tests that referenced normalizeHeader locally */
export { normalizeHeader };
