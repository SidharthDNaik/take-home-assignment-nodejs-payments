# Commission Reporting API (Take-Home)

A small read-only reporting API for commission activity and allocations, backed by a pre-seeded PostgreSQL database.

## Requirements
- Node.js 18+
- Docker / Docker Compose

---

# Running locally

## Get the code
Pull down the repo and make sure you have the takehome branch changes

https://github.com/SidharthDNaik/take-home-assignment-nodejs-payments.git

git pull origin takehome

## Start PostgreSQL with seed data
docker compose up -d

## Install dependencies
npm install

## Start the dev server
npm run dev

## Run tests
npm test

If you use a separate test database/container, ensure the integration test command points at it via `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`.

---

## API overview

This API provides two endpoints:

1) **Transaction details**: browse individual commissions with their allocation breakdowns (paginated).
2) **Period summary**: aggregate totals over a period, including breakdowns by status and party type.

All endpoints are `GET` since this is a read-only reporting service.

### 1) GET `/api/v1/commissions/details`

Fetch a paginated list of commissions for a team, including allocations inline

**Query params**
- `team_id` (required, UUID)
- `status` (optional, defaults to `finalized`)
- `after` (optional, defaults to last 30 days; parsed as date)
- `before` (optional, defaults to last 30 days; parsed as date)
- `limit` (optional, defaults to `10`, max `100`)
- `cursor` (optional)

**Pagination**
Cursor-based pagination is used instead of offset-based pagination for scalability and stability at large row counts.  
Cursor is derived from the last row in the page using `(close_date, id)` with ordering:

- `ORDER BY close_date DESC, id DESC`
- next page filters with `(close_date, id) < (cursor_close_date, cursor_id)`

**Response (shape)**

```
{
    data": [
        {
            "id": "uuid",
            "team_id": "uuid",
            "status": "finalized",
            "close_date": "YYYY-MM-DD",
            "total_cents": "850000",
            "currency": "USD",
            "created_at": "timestamp",
            "updated_at": "timestamp",
            "allocations": [
                {
                    "id": "uuid",
                    "commission_id": "uuid",
                    "party_id": "uuid",
                    "party_type": "team_member",
                    "percentage": "0.5000",
                    "amount_cents": "425000",
                    "created_at": "timestamp"
                }
                ...
            ]
        }
        ...
    ],
    "next_cursor": "base64url(...)"
}
```

**Example Query**
```
http://localhost:3000/api/v1/commissions/details?team_id=a1a1a1a1-0000-4000-8000-000000000001&status=finalized&after=2025-01-01&before=2025-04-31&limit=5
```

---

### 2) GET `/api/v1/commissions/summary`

Returns aggregate totals for a period, optionally scoped to a team. This endpoint is designed for month-end dashboard style reporting.

**Query params**
- `team_id` (optional; if omitted, summarizes across all teams)
- `after` (optional, defaults to last 30 days; parsed as date)
- `before` (optional, defaults to last 30 days; parsed as date)

**Response (shape)**
```
{
    "period": {
        "after": "2025-02-01",
        "before": "2025-03-01"
    },
    "team_id": null,
    "num_commissions": 5,
    "total_gci_cents": "2930000",
    "by_status": {
        "draft": {
            "count": 0,
            "total_cents": "0"
        },
        "pending_approval": {
            "count": 1,
            "total_cents": "330000"
        },
        "approved": {
            "count": 2,
            "total_cents": "1000000"
        },
        "finalized": {
            "count": 2,
            "total_cents": "1600000"
        }
    },
    "by_party_type": {
        "team_member": {
            "count": 5,
            "total_cents": "1615500"
        },
        "external_agent": {
            "count": 3,
            "total_cents": "562500"
        },
        "brokerage": {
            "count": 5,
            "total_cents": "752000"
        }
    }
}
```


**Example Query**
```
http://localhost:3000/api/v1/commissions/summary?after=2025-02-01&before=2025-02-29
```

**Zero-data behavior**
If there are no matching rows in the period, the API returns zeros (not an error).  
Missing buckets (e.g. no `draft` commissions in a month) are returned as `{ count: 0, total: "0" }` at the service layer.

---

## Query approach

### Details endpoint
1) Query the paginated commission page from `commissions` using filters and cursor pagination.
2) Query all allocations for the returned commission IDs in a single `WHERE commission_id = ANY($1::uuid[])` query.
3) Group allocations by `commission_id` in memory and attach to each commission.

### Summary endpoint
Uses aggregate queries that avoid double counting:
- Overall totals + status breakdown are computed from the `commissions` table (summing `commissions.total_cents`).
- Party type breakdown is computed from `allocations` joined to filtered commissions (summing `allocations.amount_cents`).

### Date range semantics
Filtering is done on `commissions.close_date` (a `DATE` column), which represents the business-effective “transaction closed” date. This is more appropriate for Finance’s period reporting than `created_at` (which is an operational/audit timestamp and can lag behind close date).

### Money
All monetary values are stored and computed in integer cents (`BIGINT`). The API avoids floating-point math for currency.

---

## Suggested indexes

If this were productionized, these indexes would help the common query patterns:

-- Details endpoint filters + ordering

```
CREATE INDEX IF NOT EXISTS commissions_team_status_close_date_id_idx
ON commissions (team_id, status, close_date DESC, id DESC);
```

-- Summary endpoint filters
```
CREATE INDEX IF NOT EXISTS commissions_close_date_team_idx
ON commissions (close_date, team_id);
```

-- Allocation lookup by commission_id
```
CREATE INDEX IF NOT EXISTS allocations_commission_id_idx
ON allocations (commission_id);
```
---

## Testing strategy

This project includes both unit and integration tests:

- **Unit tests**
  - Pure helpers (date utilities, cursor encode/decode).

- **Integration tests**
  - Repo integration tests validate SQL against the seeded PostgreSQL database using exact expected values (IDs and known totals).
  - HTTP integration tests hit the Fastify routes via `app.inject()` (no port binding), exercising the full stack:
    route validation → service → repo → Postgres → response shape.

Tests assert exact known totals from the seed data (e.g., March 2025 totals for all teams / team_alpha).

---

## Improvements with more time

1) **Caching**
   - Cache common summary queries (e.g., month-end ranges) to reduce repeated DB load.

2) **Rate limiting**
   - Protect the DB from bursty internal usage or accidental heavy dashboard refresh patterns.

3) **Date range limits**
   - Enforce a maximum allowed range (or require explicit pagination / asynchronous reporting) to prevent expensive multi-year scans.

4) **Authentication / authorization**
   - Add authn (JWT / internal SSO) and fine-grained authz so only authorized roles (Finance, Ops, admins) can access team-level or org-wide reporting.

4) **Logging and metrics**
   - Metrics around cache hit and miss rates as well as query latency


