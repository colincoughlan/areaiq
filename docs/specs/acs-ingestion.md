# Spec: Census ACS ingestion (Phase 2, step 1)

## Goal

Replace sample housing/demographic figures with real U.S. Census American Community Survey
5-year estimates for the four pilot areas, with margin-of-error-driven confidence labels.

## External API

`https://api.census.gov/data/{year}/acs/acs5` — free, requires `CENSUS_API_KEY`
(https://api.census.gov/data/key_signup.html). Default year 2024 (2020–2024 5-year release),
falling back to 2023 if the vintage isn't available.

## Geography mapping

| Area | Census geography | Notes |
|---|---|---|
| Eastvale | place `06:21290` | city == area |
| Claremont | place `06:13756` | city == area |
| Fontana (Southridge) | place `06:24680` | citywide figures, labeled "Fontana citywide" |
| Highland Park | tract group in `06:037` | tract list is **provisional** — verify against TIGERweb before trusting output |

Safety: the script validates the returned `NAME` against an expected pattern for each place
and refuses to write output on mismatch (guards against wrong FIPS codes).

## Variables (v1)

| Metric | Table | Derivation |
|---|---|---|
| Owner-occupied % | B25003_002E / B25003_001E | ratio, MOE-propagated |
| Renter-occupied % | B25003_003E / B25003_001E | ratio |
| Vacancy % | B25002_003E / B25002_001E | ratio |
| Median year built | B25035_001E | places only (medians can't be summed across tracts) |
| Median household income | B19013_001E | places only |
| Population | B01003_001E | summable |

Tract groups: estimates summed; MOE aggregated as sqrt of sum of squares. Medians omitted.

## Confidence from MOE

Relative MOE (90% CI) on the primary estimate: `< 10%` → high, `< 25%` → medium, else limited.
Derived ratios use the standard ACS ratio-MOE approximation.

## Storage

`npm run ingest:acs` writes `src/lib/generated/acs.json` (committed). `areas.ts` overlays
these values onto the sample data at module load; anything not covered stays sample-labeled.
Supabase upsert mode comes later — same normalized shape maps onto `housing_metrics` +
`source_documents`.

## Security & privacy

Public aggregate data only; no PII. Key stays in `.env.local`. No fair-housing exposure:
tenure/vacancy/income are presented neutrally with sources and are not inputs to any
ranking across areas.

## Acceptance tests

- Fixture-based: a recorded ACS response normalizes to expected percentages and MOEs.
- MOE→confidence thresholds unit-tested.
- Wrong-NAME guard rejects a mismatched response.
- Tract aggregation sums estimates and root-sum-squares MOEs.
- App renders overlay values with `government-dataset` source kind when present.
