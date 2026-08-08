# Spec: School directory ingestion (Phase 2, step 3)

## Goal

Replace sample school listings with official CA Department of Education data for all four
pilot areas — the first dataset that upgrades every pilot report at once.

## Source

CDE public school directory, tab-delimited download (~8.8MB, 18k rows):
`https://www.cde.ca.gov/schooldirectory/report?rid=dl1&tp=txt`
Fields used: StatusType, District, School, SOCType, GSoffered, Charter, Magnet, Virtual,
Latitude, Longitude. Columns are resolved by header name, not position.

No key required. `CDE_FILE=/path/to/pubschls.txt` skips the download (useful for tests/CI).

## Selection rules

Active schools only; real instructional types (Elementary / Middle-Junior / High / K-12);
exclusively-virtual schools excluded (a virtual school is not a neighborhood amenity).
Per area: nearest 8 schools within 2.0 miles of the area center (haversine),
sorted by distance. Charter and magnet status shown as flags, never as quality signals.

## Product rule

AreaIQ displays official facts (type, grades, distance, district) — no third-party quality
scores and no ranking of schools. This is both a product principle and a fair-housing
posture (school "quality" scores are a classic steering proxy).

## Output

`npm run ingest:schools` → `src/lib/generated/schools.json`. Overlay replaces the sample
`schools` array; the report section gains a CDE source tag with retrieval date.

## Acceptance tests

- Haversine distance sanity (known coordinate pairs).
- Header-driven TSV parsing on a fixture (column reorder must not break parsing).
- Filtering: inactive, virtual, and office rows excluded; radius and sort respected.
- Live run: known schools (Eleanor Roosevelt High → Eastvale, Franklin High → Highland
  Park) appear in their areas.
