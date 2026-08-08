# Spec: Data aggregation roadmap — the 10 reference tools and what we take from each

The strategy is never "embed competitors" — it's: for each tool people currently juggle,
identify the underlying data or pattern, and pull it through our one pipeline
(ingest script → generated JSON → overlay → report + API + AI fact sheet), sourced and
confidence-labeled like everything else. Official/free sources first; attribution always;
no scraping against ToS; commercial licenses only after demand is proven.

| # | Tool people use | What they use it for | What AreaIQ takes | Integration path | Status |
|---|---|---|---|---|---|
| 1 | Zillow / Redfin | Prices, market heat | City-level median sale price, inventory, days-on-market, price drops | **Redfin Data Center** free downloadable TSVs, monthly, attribution required | Build next |
| 2 | Walk Score | Walkability | Walkability/transit access | Their API (5k calls/day free) OR our own transparent **15-minute access score** computed from OSM data we already have | Build next (own metric preferred) |
| 3 | GreatSchools / Niche | School quality | Nothing to license — we beat them with official CDE data | Add CAASPP test results + chronic absenteeism (same CDE download pattern as ACGR) | Grad rates DONE; extend |
| 4 | Nextdoor | Local chatter | The *pattern* only: structured, verified local knowledge without a feed | Phase 4 community system per original brief | Roadmap |
| 5 | Citizen / NeighborhoodScout | Crime | The *demand* only — their presentation is the anti-pattern | CA DOJ OpenJustice + FBI CDE, city-level trends, counsel-gated (docs/specs/crime-data.md) | Spec'd, gated |
| 6 | Risk Factor (First Street) | Climate/hazard risk per home | Flood/fire/heat exposure per area | FEMA NFHL + CAL FIRE FHSZ + CalEnviroScreen GIS layers (free), point-in-polygon per region — same technique as county assignment | Build soon (risk headline per all 334 regions) |
| 7 | Google Popular Times | Busyness | Nothing available (no API) — our **Pulse** is the first-party answer and merchant-verified where Google guesses | Already built | DONE |
| 8 | Yelp | Business info/reviews | Venue enrichment: categories, hours, price level; merchant-onboarding autofill | Yelp Fusion API (free tier); display per venue with attribution, never scraped review text | With merchant dashboard |
| 9 | Zumper / Apartment List | Rents | Median rent + affordability context | ACS B25064 median gross rent (add one variable to existing pipeline) + HUD Fair Market Rents (free download) | Build next (trivial) |
| 10 | BLS data (via news apps) | Jobs | Monthly county unemployment trend + industry mix | BLS LAUS API (free) — fresher than ACS; complements our place-level ACS rate | Build soon |

## Why aggregation is the value ("across the board")

Each tool above answers one question in one app. AreaIQ's compounding advantage is the
JOIN: price (Redfin) × trajectory (permits) × schools (CDE) × rent (ACS/HUD) × risk
(FEMA/CAL FIRE) × live local life (Pulse/Offers) on ONE page with consistent sourcing.
The AI fact sheet gets every new source automatically, so Ask AreaIQ improves with each
adapter without prompt changes.

## Priority order (value ÷ effort)

1. **Median rent** (ACS B25064) — one variable, all 338 areas, families ask it first.
2. **Redfin market data** — real prices replace the last big sample-data block.
3. **15-minute access score** — our own Walk Score from data in hand, fully transparent
   methodology (distance to nearest grocery/park/school/pharmacy/transit).
4. **Hazard layers** (FEMA/CAL FIRE/CalEnviroScreen) — risk headline for all regions,
   not just pilots.
5. **BLS LAUS** — monthly county unemployment trends.
6. **CAASPP + absenteeism** — deepen school outcomes.
7. **Yelp enrichment** — with the merchant dashboard slice.
8. Crime (counsel-gated), community knowledge (Phase 4), MLS/ATTOM (license, post-demand).

## Rules (unchanged)

Every adapter: source name, retrieval date, confidence label, license note. No scraping
Zillow/Nextdoor/Google. Nothing demographic enters any score. Sample data always labeled.
