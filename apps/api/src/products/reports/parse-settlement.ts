/**
 * Parser for Flat File V2 Settlement Report
 * (GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2).
 *
 * Extracts per-SKU unit FBA fulfillment fees from
 * amount-description = FBAPerUnitFulfillmentFee.
 */

import { col, headerIndex, parseNumber, splitLine } from './tsv';

export type SettlementFeeCharge = {
  sku: string;
  unitFeeUsd: number;
  postedAt: string | null;
  quantity: number;
  currency: string | null;
  orderId: string | null;
};

export type SettlementParseResult = {
  charges: SettlementFeeCharge[];
  /** Latest unit fee per SKU (by posted date, then file order). */
  latestBySku: Map<string, SettlementFeeCharge>;
  issues: { line: number; sku?: string; reason: string }[];
  settlementId: string | null;
  currency: string | null;
};

function parsePostedAt(date: string | undefined, dateTime: string | undefined): string | null {
  const raw = (dateTime || date || '').trim();
  if (!raw) return null;
  // US: 2026-10-19 09:57:53 UTC  |  EU-ish: 19.10.2026 09:57:53 UTC
  const isoish = raw.replace(
    /^(\d{2})\.(\d{2})\.(\d{4})/,
    (_m, d, m, y) => `${y}-${m}-${d}`,
  );
  const t = Date.parse(isoish.replace(' UTC', 'Z').replace(' ', 'T'));
  if (Number.isFinite(t)) return new Date(t).toISOString();
  return raw;
}

export function parseSettlementV2Text(text: string): SettlementParseResult {
  const parsed = headerIndex(text);
  const issues: SettlementParseResult['issues'] = [];
  if (!parsed || parsed.lines.length < 2) {
    return {
      charges: [],
      latestBySku: new Map(),
      issues: [{ line: 1, reason: 'Empty or invalid settlement file' }],
      settlementId: null,
      currency: null,
    };
  }

  const { lines, index } = parsed;
  if (
    !index.has('amount-description') ||
    !index.has('amount') ||
    !index.has('sku')
  ) {
    return {
      charges: [],
      latestBySku: new Map(),
      issues: [
        {
          line: 1,
          reason: 'Missing settlement columns (is this Settlement V2?)',
        },
      ],
      settlementId: null,
      currency: null,
    };
  }

  // Header summary row often has settlement-id in first data line
  const firstCells = splitLine(lines[1]!);
  const settlementId =
    col(firstCells, index, 'settlement-id')?.trim() || null;
  const currency = col(firstCells, index, 'currency')?.trim() || null;

  const charges: SettlementFeeCharge[] = [];

  for (let li = 1; li < lines.length; li++) {
    const lineNo = li + 1;
    const cells = splitLine(lines[li]!);
    const desc = col(cells, index, 'amount-description')?.trim() ?? '';
    if (desc !== 'FBAPerUnitFulfillmentFee') continue;

    const sku = col(cells, index, 'sku')?.trim() ?? '';
    if (!sku) {
      issues.push({ line: lineNo, reason: 'FBA fee row missing SKU' });
      continue;
    }

    const amount = parseNumber(col(cells, index, 'amount'));
    if (amount == null) {
      issues.push({ line: lineNo, sku, reason: 'Invalid fee amount' });
      continue;
    }

    const qtyRaw = parseNumber(col(cells, index, 'quantity-purchased'));
    const quantity = qtyRaw != null && qtyRaw > 0 ? qtyRaw : 1;
    const unitFeeUsd = Math.abs(amount) / quantity;
    if (unitFeeUsd <= 0) {
      issues.push({ line: lineNo, sku, reason: 'Non-positive unit fee' });
      continue;
    }

    const rowCurrency = col(cells, index, 'currency')?.trim() || currency;
    // Skip non-USD for v1 rate card
    if (rowCurrency && rowCurrency.toUpperCase() !== 'USD') {
      issues.push({
        line: lineNo,
        sku,
        reason: `Skipped non-USD currency ${rowCurrency}`,
      });
      continue;
    }

    charges.push({
      sku,
      unitFeeUsd: Math.round(unitFeeUsd * 100) / 100,
      postedAt: parsePostedAt(
        col(cells, index, 'posted-date'),
        col(cells, index, 'posted-date-time'),
      ),
      quantity,
      currency: rowCurrency || 'USD',
      orderId: col(cells, index, 'order-id')?.trim() || null,
    });
  }

  const latestBySku = new Map<string, SettlementFeeCharge>();
  for (const c of charges) {
    const prev = latestBySku.get(c.sku);
    if (!prev) {
      latestBySku.set(c.sku, c);
      continue;
    }
    if (!prev.postedAt && c.postedAt) {
      latestBySku.set(c.sku, c);
      continue;
    }
    if (prev.postedAt && c.postedAt && c.postedAt > prev.postedAt) {
      latestBySku.set(c.sku, c);
    }
  }

  return { charges, latestBySku, issues, settlementId, currency };
}
