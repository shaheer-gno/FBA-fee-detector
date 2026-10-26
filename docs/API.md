# API reference

Base URL (local): `http://localhost:3001/api`  
Global prefix: `/api`  
JSON bodies; validation errors return Nest `400` with `message`.

### Pagination (lists)

`GET /products` and `GET /detections` return:

```ts
{
  items: T[]
  total: number
  page: number      // 1-based
  pageSize: number  // default 10, max 100
}
```

Query: `?page=1&pageSize=10`

---

## Products

### `GET /products`

Paginated product list (newest first).

### `GET /products/:id`

**Response:** `Product`  
**404** if missing.

### `POST /products`

Create a product (dims/weight set once; editable later).

```json
{
  "sku": "SKU-001",
  "asin": "B0EXAMPLE",
  "title": "Example widget",
  "lengthIn": 8,
  "widthIn": 5,
  "heightIn": 0.5,
  "unitWeightOz": 10,
  "category": "general",
  "sellingPriceUsd": 25,
  "lastChargedFeeUsd": 4.2,
  "active": true
}
```

`asin`, `title`, `lastChargedFeeUsd` optional. `active` defaults to `true`.  
**409** if `sku` already exists.

### `PATCH /products/:id`

Partial update — same fields as create (all optional).  
**404** if missing. **409** on sku conflict.

### `DELETE /products/:id`

Deletes the product. Linked detections keep history with `product_id` set null.

### `POST /products/:id/detect`

Run detection using stored product dims. Supply Amazon’s charged fee (also updates `lastChargedFeeUsd`).

```json
{
  "chargedFeeUsd": 4.2,
  "feeDate": "2026-10-21",
  "sellingPriceUsd": 25
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `chargedFeeUsd` | yes | Fee Amazon is charging for this unit |
| `feeDate` | no | Defaults to today (UTC date). Infers peak/non-peak |
| `sellingPriceUsd` | no | Defaults to product’s stored price |

**Response:** same shape as analyze (includes `productId`, `source: "product"`).

---

## Detections

### `POST /detections/analyze`

One-off analyze (no product required). Snapshots inputs onto a detection with `source: "manual"`.

```json
{
  "lengthIn": 8,
  "widthIn": 5,
  "heightIn": 0.5,
  "unitWeightOz": 10,
  "category": "general",
  "sellingPriceUsd": 25,
  "feeDate": "2026-10-21",
  "chargedFeeUsd": 4.2
}
```

### `POST /detections/run-daily`

Run detection for all **active** products that have a charged fee.

```json
{
  "feeDate": "2026-10-21",
  "charges": [
    { "productId": "uuid-…", "chargedFeeUsd": 4.2 }
  ]
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `feeDate` | no | Defaults to today |
| `charges` | no | Optional overrides; otherwise uses each product’s `lastChargedFeeUsd` |

**Response:**

```json
{
  "feeDate": "2026-10-21",
  "season": "non_peak",
  "ran": [ /* DetectionResult[] */ ],
  "skipped": [
    { "productId": "…", "sku": "…", "reason": "no_charged_fee" }
  ]
}
```

### `GET /detections`

Paginated detections (newest first).

**Query:**

| Param | Notes |
|-------|--------|
| `page` | 1-based, default 1 |
| `pageSize` | default 10, max 100 |
| `productId` | optional UUID — only detections for that product |

Example: `GET /detections?page=1&pageSize=10&productId=<uuid>`

Each item includes `productSku`, `productAsin`, `productTitle` when linked (null for one-off).

---

## Shared types

### `category`

`general` | `apparel` | `dangerous_goods`

### `verdict`

`correct` | `overcharged` | `undercharged`

### `source`

`manual` | `product` | `daily_job`

### `Product`

```ts
{
  id: string
  createdAt: string
  updatedAt: string
  sku: string
  asin: string | null
  title: string | null
  lengthIn: number
  widthIn: number
  heightIn: number
  unitWeightOz: number
  category: Category
  sellingPriceUsd: number
  lastChargedFeeUsd: number | null
  active: boolean
  /** Present on list responses — most recent detection, or null */
  latestDetection: LatestDetectionSummary | null
}
```

`latestDetection` includes verdict, fees, explanation, dims snapshot, size tier, reverse-match fields — used by the products “FBA status” column and View details modal.
