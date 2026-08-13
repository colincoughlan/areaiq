# AreaIQ — Engineering Instructions

AreaIQ is a neighborhood-intelligence web app: search a Southern California address, get a simple, source-backed report on the area and where it's heading. This file governs all AI-assisted development in this repo.

## Product rules (non-negotiable)

1. **Never fabricate neighborhood facts.** Every displayed data point carries a source, retrieval date, and confidence level. In Phase 1 the data is mock/sample and must be labeled as such in the UI.
2. **Fair housing.** Protected characteristics (race, color, national origin, religion, sex, familial status, disability) are never used to score, rank, filter, or recommend areas. No proxies, no coded language. Demographic data, when added, is presented neutrally with sources.
3. **Component scores, not a single ranking.** We display Daily Life, Housing, and FutureScore separately with a confidence label. There is no overall "AreaIQ score" — a composite number invites disparate-impact steering risk. Strengths/tradeoffs narrative carries the conclusion.
4. **Tradeoffs, not labels.** Never render "good/bad/safe/unsafe" area language. Every area summary shows strengths AND tradeoffs.
5. **No community feed in MVP.** Community contributions are out of scope until Phase 4; only an "report an error" mailto exists for now.
5a. **Local Offers** (docs/specs/local-offers.md): merchant offers are geo-targeted by AREA only, never by person or demographic; category allowlist excludes housing/lending/employment entirely; all offers expire ≤7 days and publish only after moderation. Demo mode (fictional, labeled) without Supabase; live mode with it.
5b. **Neighborhood Pulse** (docs/specs/neighborhood-pulse.md): venue busyness from merchant reports (weight 3) + anonymous guest check-ins (weight 1), 90-min decay half-life, stale→unknown. Vibe is neutral (Quiet/Steady/Lively/Packed) — never good/bad/safe language, never aggregated to neighborhood level. Check-ins never expose identity.
6. **Fire/flood risk belongs in the summary card**, not buried — out-of-area buyers don't know CAL FIRE zones exist.
7. **AI answers cite sources** and display uncertainty. Forecast language is prohibited ("will appreciate"); use activity indicators ("permit filings above county rate").

## Stack

Next.js 14 (App Router) · TypeScript strict · React 18 · Tailwind CSS · Mapbox GL JS (token via `NEXT_PUBLIC_MAPBOX_TOKEN`; the map component must degrade gracefully without one) · Supabase (Postgres + PostGIS, schema in `supabase/migrations/`) — not wired up in Phase 1 · Vitest for unit tests.

## Repo layout

- `src/app/` — routes: `/` (home/search), `/area/[id]` (report), `/explore/[id]` (map), `/compare` (two-area comparison)
- `src/components/` — UI components; client components only where interactivity requires it
- `src/lib/types.ts` — domain types; `src/lib/areas.ts` — Phase 1 mock data for 4 pilot areas
- `supabase/migrations/` — SQL schema (forward-only migrations)
- `docs/` — specs and data-source inventory

## Working rules

- Before each major feature: write a short plan (DB changes, external APIs, security/privacy risks, acceptance tests) in `docs/specs/`, then implement.
- `npm run typecheck` and `npm run test` must pass before any commit.
- No scraping listing platforms. No `localStorage` of personal data. Secrets only in `.env.local` (gitignored).
- Keep changes small and reviewable; one feature per commit.

## Phase status

- [x] Phase 1: prototype with mock data (this codebase)
- [~] Phase 2 in progress:
  - ACS ingestion live (`npm run ingest:acs`, needs `CENSUS_API_KEY`; Highland Park tract list PROVISIONAL — verify before publishing)
  - LA permit ingestion live (`npm run ingest:permits`, no key; dataset pi9x-tg5x; Highland Park only — extending to other cities requires per-city adapters, see docs/specs/permits-ingestion.md)
  - CDE schools ingestion live (`npm run ingest:schools`, no key; all 4 pilot areas; official directory facts only, no quality scores — fair-housing rule)
  - Ask AreaIQ live (`/api/ask` + widget; needs `ANTHROPIC_API_KEY`; answers grounded in src/lib/ai/context.ts fact sheet, validated by src/lib/ai/validate.ts — citations required, banned-language/forecast/steering rejected; rejected answers never shown)
  - App packaging live: installable PWA (manifest, icons, conservative service worker — API always network-only) + API-first endpoints (`/api/areas`, `/api/areas/[id]`, `/api/ask`) so a Capacitor/native client is packaging, not a rebuild (docs/specs/app-packaging.md)
  - Amenity POIs live (`npm run ingest:amenities`, OSM/Overpass, no key; resumable — writes after each area; ODbL attribution required in every label; single-line query only, newlines cause Overpass 406)
  - School outcomes live (`npm run ingest:outcomes`): CDE ACGR graduation + UC/CSU rates per high school with state baseline; CDE "*" suppression preserved; numbers with context, never letter grades (docs/specs/family-lens.md)
  - Employment live: ACS B23025 unemployment in pilot + all-region pipelines
  - Median rent live: ACS B25064 in pilot + all-region pipelines
  - 15-minute access score live (`src/lib/access.ts`): transparent daily-life-reachability score for pilot areas, built from amenities + schools, no external API
  - Redfin market data: ingestion script ready (`npm run ingest:market`), not yet run to completion — 1GB source file, run locally per DEPLOY.md; UI renders nothing until `market.json` is populated
  - Trajectory indicators live (`npm run ingest:trends`): non-overlapping ACS window comparison (income/population change vs regional median) + BLS county unemployment trend, both wired into pilot reports and coverage snapshots
  - Public methodology page live (`/methodology`): full source list, confidence-label explanation, fair-housing rules, two-tier report explanation — linked from nav and both report types
  - `/explore/[id]` map view extended from 4 pilot areas to all 334 SoCal regions (`RegionMapView`, `RegionExploreSummary`) — every covered place now has its own map page, not just pilots
  - Family/Investor persona lens live (`src/lib/lens.ts`, `LensLayout`): reorders report sections by priority on both pilot and coverage-tier pages; never filters, every lens shows every section (enforced by test)
  - Android Web Share Target live (`docs/specs/share-target.md`, `src/lib/share-target.ts`, `/share`): share a Zillow/Redfin/Realtor.com listing from Android's share sheet straight into an installed AreaIQ, best-effort city-slug match → redirect to that area's report, honest fallback to search when no match. iOS has no equivalent (Safari doesn't support Web Share Target) — needs the Capacitor wrapper.
  - Permit adapters for all 4 pilots live: Eastvale, Fontana, and Claremont now use CA HCD's statewide Annual Progress Report data (`npm run ingest:permits-hcd`) since none of the three has a self-serve open-data API (Eastvale's Accela portal is partnership-gated) — see docs/specs/permits-ingestion.md for the full tradeoffs (no dollar valuation, annual self-reported filings, "new units only" scope). Merges into the same permits.json Highland Park's live LA Socrata feed writes, without touching it.
  - Safety data: spec'd but GATED on fair-housing counsel review (docs/specs/crime-data.md) — legal-first, build-second
  - Children-by-age-bracket demographics live in code (ACS table B09001, `src/lib/acs.ts` CHILD_BRACKETS, pilot + all-334-region pipelines, Ask AreaIQ context): needs `CENSUS_API_KEY` to actually run `npm run ingest:acs && npm run ingest:regions` and regenerate `acs.json`/`acs-regions.json` before real numbers appear — current generated files predate this field, so the UI sections render nothing until re-ingested
  - "Is there a competing X nearby" business search live (`docs/specs/nearby-business-search.md`, `src/lib/nearby-business.ts`, `/api/nearby-business`, `NearbyBusinessSearch`): live on-demand Overpass query, deterministic (no AI), on both pilot and all 334 coverage-tier pages. Curated tag categories (dance, martial arts, gymnastics, swim, music lessons, tutoring, gym/yoga, preschool, salons) plus a name-text fallback for anything else. Has a 12s timeout + mirror fallback since the free public Overpass instance is known to be flaky under load.
  - Budget + must-have-amenities matching live at `/find` (`docs/specs/budget-amenity-match.md`, `src/lib/region-match.ts`, `region-match-data.ts`): filters (never scores) the 334 covered places by max median rent (ACS) + must-have amenity categories (added a new `nightlife` category — bars/pubs/nightclubs). Plain GET form, no JS required, no live external calls. **Region-wide amenity data isn't ingested yet** — `npm run ingest:amenities-regions` (resumable, `--limit N` for partial runs) needs to actually run before "must have" filters return anything; rent-only searches already work against real data today.
  - Remaining, roughly in build order: run `ingest:amenities-regions` to completion (334-region Overpass job, resumable); events/things-to-do data layer (concerts, festivals — scoped to LA first, needs a Ticketmaster or Eventbrite API key); Supabase wiring (auth + saved areas + offers/pulse live mode); iOS Capacitor wrapper (needs Xcode/Apple Developer account on a Mac); community services directory (babysitters/dog walkers/handymen — needs a trust & safety plan, deliberately last); pre-generated AI narratives; run Redfin market ingestion to completion; app rename (AreaIQ name is taken)
- [ ] Phase 3: private beta (6–10 pilot areas, feedback loop, willingness-to-pay test)
- [ ] Phase 4: SoCal launch (Realtor Pro exports, alerts, community layer)

Pilot areas (chosen to span market types; re-validate against data availability before Phase 2): Highland Park (LA, transitioning), Eastvale (Riverside, high-growth), Fontana/Southridge (San Bernardino, affordable IE), Claremont (LA, premium suburban).
