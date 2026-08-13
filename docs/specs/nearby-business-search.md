# Spec: Nearby business/competitor search ("is there a competing X nearby")

## Origin

A real buyer question, given verbatim by a user testing the product: "is there
other competing dance schools in the area" (asked in the context of possibly
relocating a spouse's dance-school business). Generalized beyond dance
schools, since the same question applies to any personal-service business a
buyer or renter might run or care about (gym, salon, tutoring center, etc.).

## Why deterministic, not AI

An AI summarizing "competition nearby" from a fuzzy prompt risks inventing or
omitting a real business — the one failure mode that matters most for this
specific question, since a wrong answer directly affects someone's livelihood
decision. A direct tag/name lookup against OpenStreetMap can't hallucinate:
it either finds a named, mapped business or it doesn't. This is a live,
un-cached search, not an AI feature, and it does not go through Ask AreaIQ.

## Source

OpenStreetMap via the public Overpass API — the same source and endpoint as
the existing amenities pipeline (`src/lib/amenities.ts`). No key required.
Live per-request query, not pre-ingested, since the search term is free text
and can't be enumerated in advance the way the fixed 9 amenity categories
were.

## Probe

Live-tested against a bounding box covering the San Gabriel Valley/LA area
for "dance schools" before building anything (probe-first rule): found 9 real,
well-tagged dance businesses (Sheng Ballet, Pointe Ballet, Glow Dance &
Fitness, Dance123, M Dance Collective, Lai Lai Ballroom & Studio, Vibes LA
Dance Studio, Liya Art Center) with addresses, phone numbers, and one
`check_date` from within the past week — confirming this data source has
real, current coverage for at least this business type in this metro, not
just sparse/stale tags.

## Design

- `src/lib/nearby-business.ts` — pure logic. A curated list of ~9 common
  categories (dance, martial arts, gymnastics, swim, music lessons, tutoring,
  gym/fitness/yoga, preschool/childcare, salons) map free-text search terms
  to precise OSM tag filters. Unrecognized terms fall back to a name-text
  search across all POIs — broader but noisier, so results are labeled
  `matchType: "tagged"` (precise category match) vs `"name"` (the search term
  just appears in the listing's name — shown with a "verify category" flag
  in the UI, since a name match can be a false positive, e.g. a dance-themed
  clothing store showing up under a "dance" search).
- `src/app/api/nearby-business/route.ts` — server route, live Overpass call,
  3-mile radius (wider than the 2-mile daily-life amenity radius, since
  competitive awareness reasonably extends further than walkable amenities),
  naive rate limit matching `/api/ask`'s pattern.
- `src/components/NearbyBusinessSearch.tsx` — client widget: free-text input
  + suggestion chips, results list with distance/address/phone/website,
  OSM/ODbL attribution, honest empty-state copy ("none found on the map,"
  not "confirmed absence" — coverage varies by area).
- Available on both pilot area pages and all 334 coverage-tier region pages
  (uses the same `lat`/`lng` already on `Area`/`RegionEntry`), added to both
  persona-lens orderings as `businessSearch`.

## Limitations, stated rather than hidden

- OSM coverage varies by area and business type — dense, actively-mapped
  metros like LA proper will have far better coverage than smaller Inland
  Empire cities. A zero-result search is not proof no competitor exists.
- The category list is a seed, not exhaustive; anything outside it degrades
  to a noisier name-only search.
- No dedupe against permit/business-license data — purely a map-tag search.
