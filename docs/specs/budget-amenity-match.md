# Spec: Budget + must-have-amenities area matching (`/find`)

## Origin

Verbatim user request: "our max budget but still want certain things like
bars restaurants etc. that kind of detail in the areas." A filter, not a
recommendation — the user picks the constraints, AreaIQ shows which of the
334 covered SoCal places satisfy all of them.

## Design principles (fair-housing-adjacent, even though budget/amenities
aren't protected characteristics)

- **Filters, doesn't score.** No "best fit" ranking beyond the stated
  criteria — matches sort by rent ascending, nothing else. This mirrors the
  "reorder, never filter" rule from the persona lens in spirit: the *only*
  thing that removes a place from results is the user's own stated
  requirement, never an AreaIQ judgment.
- **Never guesses to produce a match.** If a place's rent or amenity data
  hasn't been ingested, it's excluded from filtered results rather than
  assumed to pass — see `rankRegions`'s `failsBudget` and the "no amenity
  data" test case in `region-match.test.ts`. Data coverage gaps are surfaced
  in the UI (`coverage.withAmenityData` vs `coverage.totalCandidates`), not
  hidden.
- **"Must have" is all-or-nothing**, not weighted — matches the literal user
  ask ("still want certain things") rather than inventing a fuzzy scoring
  model.

## Data sources

- **Budget**: U.S. Census ACS median gross rent (B25064), already ingested
  for all 4 pilots and all 334 regions. Sale price isn't used since Redfin
  market ingestion (`market.json`) hasn't been run to completion and only
  covers a handful of areas even when it is — rent is the one budget figure
  with real, consistent coverage across every place.
- **Amenities**: OSM/Overpass, same pipeline as the existing pilot-area
  amenities feature, now extended to a new category (`nightlife`: bars,
  pubs, nightclubs — directly requested) and a new ingestion script,
  `scripts/ingest-amenities-regions.ts`, covering all 334 regions instead of
  just the 4 pilots.

## Status: code complete, region-wide amenity data not yet fully ingested

`ingest-amenities-regions.ts` is a genuinely long-running job — 334
sequential live Overpass queries against a free public API that's known to
be flaky under load (see `docs/specs/nearby-business-search.md`'s
transient-outage note from the same session). It's resumable (writes after
every region, `--limit N` for partial runs, safe to stop/restart) but
running it to completion needs a dedicated stretch of time, the same
treatment given to the 1GB Redfin market download. Until it's run:
`amenities-regions.json` is a stub (`areas: {}`), so `/find` correctly
shows 0 places with amenity data and excludes everything from "must have"
results — never fabricates a match. Rent-only searches (no "must have"
boxes checked) work today against real data for all 334 regions.

## UI

`/find` — plain GET form (works without JS): max-rent number input +
must-have checkboxes (reusing `CATEGORY_LABELS`), server-rendered results
list linking into each place's report. Kept as a static form rather than a
client-side search to keep it simple and robust; no live external calls at
request time (unlike the business-search feature), since it only reads
already-generated JSON.
