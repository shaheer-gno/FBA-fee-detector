# FBA Fee Preview import

Bulk-load products from Amazon’s **FBA Fee Preview** report  
(`GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA`).

Docs: [FBA report types](https://developer-docs.amazon.com/sp-api/docs/report-type-values-fba)

## Today (no SP-API in our app)

1. Bilal downloads **Fee Preview** from Seller Central (or SP-API).
2. In the app: **Import Fee Preview** → upload `.txt` / `.tsv` / `.csv`.
3. We upsert by SKU and set `fee_source = fee_preview` so the Amazon fee is **locked**.

## Columns we use

| Report column | Product field |
|---------------|---------------|
| `sku` | `sku` |
| `asin` | `asin` |
| `product-name` | `title` |
| `longest-side` / `median-side` / `shortest-side` | length / width / height (inches) |
| `item-package-weight` (+ `unit-of-weight`) | `unit_weight_oz` |
| `your-price` or `sales-price` | `selling_price_usd` |
| `expected-fulfillment-fee-per-unit` | `last_charged_fee_usd` (locked) |

Category defaults to `general`. Non-Amazon `fulfilled-by` rows are skipped.

**Note:** Dims on this report are **Amazon’s** package values. Edit dims afterward to seller truth if they differ; the fee stays locked until you re-import.

## API

`POST /api/products/import/fee-preview`  
Body: `{ "text": "<file contents>" }`

## Later

Automate the same report via SP-API Reports API (`createReport` → download document) using the same parser.
