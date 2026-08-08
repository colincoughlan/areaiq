# Spec: Amenity POI ingestion (Phase 2, step 5)

## Goal

Replace sample amenity counts with real points of interest for all four pilot areas —
the data behind the Daily Life story.

## Source

OpenStreetMap via the Overpass API (`overpass-api.de`). Free, keyless. License: ODbL —
attribution "© OpenStreetMap contributors" is required and carried in every source label.
OSM completeness varies by area; that limitation is disclosed in the UI (counts are
"mapped in OSM", not ground truth) and the category counts get "medium" confidence.

## Categories (OSM tag mapping)

grocery (shop=supermarket|grocery|greengrocer) · pharmacy (amenity=pharmacy) ·
food & cafés (amenity=restaurant|cafe|fast_food) · parks (leisure=park) ·
library (amenity=library) · healthcare (amenity=clinic|doctors|hospital) ·
fitness (leisure=fitness_centre) · childcare (amenity=childcare|kindergarten) ·
transit stations (railway=station | public_transport=station)

One `nwr … around:3218m` (2 mi, matching the schools radius) query per area with
`out center` so ways/relations (parks are usually polygons) resolve to centroids.
Sequential queries with a courtesy delay — public Overpass servers rate-limit.

## Output

`npm run ingest:amenities` → `src/lib/generated/amenities.json`: per-area counts by
category plus up to three named nearest examples per category. Overlay replaces the
sample `amenityDetail` rows; the section gains an OSM source tag with retrieval date.

## Acceptance tests

- Tag→category mapping (incl. precedence and unmatched tags → null).
- Summarize: counts, nearest-example ordering, unnamed POIs excluded from examples but
  counted; ways with `center` coordinates handled.
- Live run: Highland Park returns a library (Arroyo Seco confirmed in probe) and
  nonzero grocery/restaurant counts for every area.
