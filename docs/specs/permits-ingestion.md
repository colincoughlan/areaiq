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

## Extension: Eastvale, Fontana, Claremont (no city-level open-data API)

Probed each city's open-data availability before building anything (probe-first rule):

- **Eastvale**: uses Accela for its permit portal. Accela's Construct API is gated behind
  developer-portal partnership approval per agency tenant — not self-serve for a third
  party, so no live adapter is possible without a partnership agreement.
- **Fontana**: no discoverable Socrata/ArcGIS open-data portal.
- **Claremont**: no discoverable open-data portal; permit status lookup is a citizen-facing
  HTML tool only, not an API.

Instead, all three (like every CA jurisdiction) file an **Annual Progress Report** with the
state under Gov. Code §65400. HCD publishes the underlying project-level data — CSV
`tablea2.csv` on data.ca.gov, statewide, public, no key required. Verified live: real
street-address rows with lat/lon and entitlement/permit/certificate-of-occupancy dates
through 2025 for all three cities (Fontana has a gap in 2020 — a real self-reporting gap in
the source, not an ingestion bug).

Tradeoffs vs. the LA Socrata feed, documented rather than hidden: no dollar valuation is
reported (the "Stated valuation" stat and "largest permits" list simply don't render for
these areas — `PermitActivity` already handles a source with zero valuation coverage
gracefully); Table A2 only tracks *new housing unit* permits, not demolitions/additions/
non-residential work, so `type` is normalized uniformly to `"Bldg-New"` with the real unit
category (SFD/ADU/5+/etc.) kept in `subType`; data is annual self-reported filings, not a
live feed, so it can lag — the existing freshness→confidence downgrade already handles
this honestly.

`npm run ingest:permits-hcd` streams the ~300MB statewide CSV and **merges** into the same
`permits.json` that `ingest:permits` writes — it only touches its three mapped areas and
never overwrites the Highland Park/LA entry.
