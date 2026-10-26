# Panda Planner — Amazon Sample Data Package

Seller: Panda Planner LLC · Marketplace: Amazon.com (US) · Exported: 2026-10-22

All flat files are tab-separated (TSV) with a header row, exactly as Amazon's
Reporting API returns them.

| File | Amazon report type | Contents |
|---|---|---|
| `fba-fee-preview.tsv` | GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA | Latest snapshot. Per-SKU estimated FBA fulfillment fees, plus the dimensions and weight Amazon has on file for each item. |
| `merchant-listings-all.tsv` | GET_MERCHANT_LISTINGS_ALL_DATA | Latest snapshot. Every listing: SKU, ASIN, price, quantity, status, fulfillment channel. |
| `fba-myi-all-inventory.tsv` | GET_FBA_MYI_ALL_INVENTORY_DATA | Latest snapshot. FBA inventory levels per SKU (fulfillable, reserved, inbound, unsellable). |
| `all-orders-2026-09-22_2026-10-22.tsv` | GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL | Last 30 days of orders, one row per (order, SKU) line item, filtered by purchase date. |
| `settlement-v2-*.tsv` | GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2 | All settlement reports Amazon generated in the last 30 days (Amazon auto-generates these on its own schedule; they cannot be requested). Filename carries the settlement period end date. Shows what Amazon actually charged/paid per transaction, including FBA and referral fees. |
| `listings-items-catalog.json` | Listings Items API 2021-08-01 (`includedData=summaries,relationships`) | Catalog data: per-SKU summaries (ASIN, title, status) and variation relationships (parent/child), fetched for every SKU in the merchant listings snapshot. |

Notes:
- Small settlement files alongside the large ones are normal — Amazon emits
  separate settlements for secondary payment groups.
- In the fee preview, `expected-fulfillment-fee-per-unit` is Amazon's estimate
  from its own measured dimensions; the settlement files show the fee actually
  charged per shipped unit (`FBA Per Unit Fulfillment Fee`).
