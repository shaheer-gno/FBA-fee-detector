import { parseFeePreviewText } from '../parse-fee-preview';

const SAMPLE = [
  [
    'sku',
    'fnsku',
    'asin',
    'amazon-store',
    'product-name',
    'product-group',
    'brand',
    'fulfilled-by',
    'your-price',
    'sales-price',
    'longest-side',
    'median-side',
    'shortest-side',
    'length-and-girth',
    'unit-of-dimension',
    'item-package-weight',
    'unit-of-weight',
    'currency',
    'product-size-tier',
    'expected-fulfillment-fee-per-unit',
  ].join('\t'),
  [
    'SKU-1',
    'X001',
    'B00TEST1',
    'Amazon.com',
    'Test Widget',
    'gl_toy',
    'Acme',
    'Amazon',
    '25.00',
    '25.00',
    '8',
    '5',
    '0.5',
    '18',
    'inches',
    '0.625',
    'pounds',
    'USD',
    'Small standard',
    '3.68',
  ].join('\t'),
  [
    'SKU-MFN',
    'X002',
    'B00TEST2',
    'Amazon.com',
    'Merchant ship',
    'gl_toy',
    'Acme',
    'Merchant',
    '10.00',
    '10.00',
    '8',
    '5',
    '1',
    '18',
    'inches',
    '1',
    'pounds',
    'USD',
    'Large standard',
    '4.20',
  ].join('\t'),
].join('\n');

describe('parseFeePreviewText', () => {
  it('parses US Fee Preview rows and converts lb → oz', () => {
    const { rows, issues } = parseFeePreviewText(SAMPLE);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.sku).toBe('SKU-1');
    expect(rows[0]!.asin).toBe('B00TEST1');
    expect(rows[0]!.lengthIn).toBe(8);
    expect(rows[0]!.widthIn).toBe(5);
    expect(rows[0]!.heightIn).toBe(0.5);
    expect(rows[0]!.unitWeightOz).toBeCloseTo(10, 5); // 0.625 lb
    expect(rows[0]!.sellingPriceUsd).toBe(25);
    expect(rows[0]!.expectedFulfillmentFeeUsd).toBe(3.68);
    expect(issues.some((i) => i.sku === 'SKU-MFN')).toBe(true);
  });

  it('rejects files without required columns', () => {
    const { rows, issues } = parseFeePreviewText('sku\tfoo\nA\t1\n');
    expect(rows).toHaveLength(0);
    expect(issues[0]!.reason).toMatch(/Missing required column/);
  });
});
