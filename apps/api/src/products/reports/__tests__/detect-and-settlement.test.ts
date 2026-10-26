import { detectAmazonReportType } from '../detect-report';
import { parseSettlementV2Text } from '../parse-settlement';

describe('detectAmazonReportType', () => {
  it('detects fee preview', () => {
    const text = [
      'sku\tlongest-side\titem-package-weight\texpected-fulfillment-fee-per-unit',
      'A\t1\t1\t3.68',
    ].join('\n');
    expect(detectAmazonReportType(text)).toBe('fee_preview');
  });

  it('detects settlement v2', () => {
    const text = [
      'settlement-id\tamount-type\tamount-description\tamount\tsku',
      '1\tItemFees\tFBAPerUnitFulfillmentFee\t-4.76\tSKU-1',
    ].join('\n');
    expect(detectAmazonReportType(text)).toBe('settlement_v2');
  });
});

describe('parseSettlementV2Text', () => {
  it('extracts latest unit FBA fee per SKU', () => {
    const text = [
      [
        'settlement-id',
        'currency',
        'transaction-type',
        'amount-type',
        'amount-description',
        'amount',
        'sku',
        'quantity-purchased',
        'posted-date-time',
      ].join('\t'),
      '99\tUSD\t\t\t\t\t\t\t',
      '99\tUSD\tOrder\tItemFees\tFBAPerUnitFulfillmentFee\t-4.76\tSKU-1\t1\t2026-10-01 10:00:00 UTC',
      '99\tUSD\tOrder\tItemFees\tFBAPerUnitFulfillmentFee\t-9.52\tSKU-1\t2\t2026-10-10 10:00:00 UTC',
      '99\tUSD\tOrder\tItemFees\tCommission\t-3.00\tSKU-1\t1\t2026-10-10 10:00:00 UTC',
      '99\tMXN\tOrder\tItemFees\tFBAPerUnitFulfillmentFee\t-50.00\tSKU-MX\t1\t2026-10-10 10:00:00 UTC',
    ].join('\n');

    const { latestBySku, charges } = parseSettlementV2Text(text);
    expect(charges).toHaveLength(2); // MX skipped
    expect(latestBySku.get('SKU-1')?.unitFeeUsd).toBe(4.76);
    expect(latestBySku.has('SKU-MX')).toBe(false);
  });
});
