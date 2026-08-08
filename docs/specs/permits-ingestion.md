# Spec: Building-permit ingestion — LA City proof of concept (Phase 2, step 2)

## Why this first

The development/permit pipeline is the product's differentiator (FutureScore evidence) and
its moat. This proves the pattern on one real city before generalizing. Highland Park is
inside LA City, so the flagship pilot area gets real development data.

## Source

LA Open Data (Socrata SODA API), dataset `pi9x-tg5x` — "Building and Safety: Building
Permits Issued from 2020 to Present". No key required at our volume (app token optional via
`LA_OPEN_DATA_APP_TOKEN`). Verified live: refreshed within days, ~404k rows, includes
census tract (`ct`), lat/lon, valuation, type, status, work description.

## Geography

The dataset's `ct` field matches ACS tract ids reformatted (`183510` → `1835.10`), so
permits and ACS demographics share the exact same tract geography — reuse
`GEOGRAPHIES["highland-park"].tracts` as the single source of truth.

## Query

SoQL: `ct in (<tracts>) AND issue_date >= <24 months ago>`, paged at 1000 rows.
Aggregate client-side: total, by permit_type, new-building count, valuation sum, top-5
notable permits by valuation.

## Output

`npm run ingest:permits` → `src/lib/generated/permits.json`. Overlay replaces the sample
`permits24mo` housing metric (source: official-record) and adds a "Recent permit activity"
block to the Development section.

## Privacy

Permit records are public official records. We store only address, work type/description,
dates, status, valuation — no applicant, contractor, or owner names, even where the
dataset exposes them.

## Freshness / trust

Output records `retrievedAt` and the dataset's max `issue_date`. If the newest permit in
the response is older than 90 days, the metric's confidence drops to "medium"; older than
180 days → "limited".

## Acceptance tests

- Tract-id reformatting (`183510` → `1835.10`, `183701` → `1837.01`).
- Fixture rows summarize to correct totals, type counts, valuation, notable ordering.
- Valuation strings parse (missing/invalid → excluded from sum, kept in count).
- Staleness → confidence downgrade logic.
- Live run: count matches an independent SoQL `count(*)` for the same filter.
