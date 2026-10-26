# FBA Fee Overcharge Detector (US)

Compare a seller’s true package dimensions/weight to the FBA fulfillment fee Amazon is charging. Set dims **once per SKU**, then run **daily** checks to catch wrong-measurement overcharges.

## Docs

- [Architecture & decisions](docs/ARCHITECTURE.md)
- [Fee math & reverse-match](docs/FEE_MATH.md)
- [API reference](docs/API.md)
- [Amazon PDF sources](docs/amazon-sources/SOURCE.md)

## Stack

- TypeScript (strict), Node 22+, pnpm workspaces (`apps/api`, `apps/web`)
- Backend: NestJS 11 — controller → service → repository
- Fee math: `FeeCalculationService`
- Frontend: React 19 + Vite + TanStack Router + Query
- Supabase Postgres (required — API fails fast on missing env or unreachable DB)

## Layout

```
apps/api/
  products/          # SKU master (dims once)
  detections/        # analyze, product detect, run-daily, list
    fee/             # size tier, weight, rate cards, season
apps/web/src/
  app/               # shell + router
  shared/            # api client, ui primitives
  modules/
    products/        # api · queries · pages · components
    history/         # api · queries · pages
    analyze/         # api · queries · pages
docs/                # Architecture + API
supabase/migrations/ # SQL schema (no ORM)
```

## Domain notes

- Size tier = first 2026 tier that fits all dim/weight limits
- Shipping weight: Small standard & XL 150+ = unit only; others = max(unit, dim)
- Dim weight = L×W×H÷139; **2 in floor** on smaller sides only for small/large bulky + XL
- Peak = Oct 15 – Jan 14 (inferred from `feeDate`)
- Charged fee is **manual for MVP** (enter per detect / daily batch)

## Requirements

- Node.js 22+
- [pnpm](https://pnpm.io) 9+
- Docker (for local Supabase)

## Setup

```bash
git clone https://github.com/shaheer-gno/FBA-fee-detector.git
cd FBA-fee-detector
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```


| App | Env file | Purpose |
|---|---|---|
| API | `apps/api/.env` | `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (all required) |
| Web | `apps/web/.env` | `VITE_API_BASE_URL` (must start with `VITE_`) |

### Database

```bash
pnpm db:start
pnpm db:status            # copy API URL + service_role into apps/api/.env
pnpm db:migrate           # apply *pending* migrations only (keeps data)
pnpm db:migration:list    # see what’s applied vs local files
```

| Command | Effect |
|---------|--------|
| `pnpm db:migrate` | **Preferred day-to-day.** Runs new SQL files only; **does not wipe products/detections**. |
| `pnpm db:reset` | **Destructive.** Drops and recreates the DB, re-runs all migrations. Use only for a clean local slate. |

The API boots only after a successful DB ping. Missing env or a down Supabase instance aborts startup with a clear error.

## Run

```bash
pnpm dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001/api  

## Test

```bash
pnpm test
```

## Quick API examples

```bash
# Create product
curl -s -X POST http://localhost:3001/api/products \
  -H 'Content-Type: application/json' \
  -d '{
    "sku": "SKU-001",
    "lengthIn": 8, "widthIn": 5, "heightIn": 0.5,
    "unitWeightOz": 10, "category": "general", "sellingPriceUsd": 25
  }'

# Detect from product (use returned id)
curl -s -X POST http://localhost:3001/api/products/<id>/detect \
  -H 'Content-Type: application/json' \
  -d '{ "chargedFeeUsd": 4.2 }'

# Daily run
curl -s -X POST http://localhost:3001/api/detections/run-daily \
  -H 'Content-Type: application/json' \
  -d '{ "charges": [{ "sku": "SKU-001", "chargedFeeUsd": 4.2 }] }'
```

Full contract: [docs/API.md](docs/API.md).
