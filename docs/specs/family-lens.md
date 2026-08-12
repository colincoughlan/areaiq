# Spec: Family Lens (and the "good/bad area" question)

## The principle

Families ask "is this a good area?" The product answers the underlying question with
facts and trajectory, never verdicts — both because verdicts are fair-housing steering
risk and because a verdict is less useful than the facts ("good for whom?"). The Family
Lens reorders and contextualizes the same sourced data for family priorities.

## What "family lens" means concretely (build order)

1. **School outcomes** ✅ (this build): official CDE graduation + UC/CSU rates per high
   school with state-average context. Numbers, not letter grades — third-party school
   scores are a classic demographic proxy; official accountability data is not.
   Next: chronic absenteeism + CAASPP results (same CDE download pattern).
2. **Employment** ✅ (this build): unemployment rate from ACS per place, with the
   regional-median comparison in snapshots.
3. **Trajectory ("up-and-coming")**: already the FutureScore thesis. Strengthen with
   ACS change over time (2013-2017 vs 2020-2024 non-overlapping windows): income,
   population, housing-unit growth → "trending" indicators, always evidence-cited.
4. **Safety data** — see docs/specs/crime-data.md. Sequenced after counsel review.
5. **Family amenities weighting**: parks, childcare, libraries already ingested;
   the lens surfaces them first with a "family checklist" layout.
6. **Parent-verified local knowledge** (with community phase): structured categories —
   playgrounds, story time, stroller-friendliness — not a forum.

## UI shape ✅ (this build)

A lens toggle on area pages: Everyone / Family / Investor (`src/lib/lens.ts`,
`src/components/LensLayout.tsx`). Same data, different ordering — every lens renders
the exact same set of report sections, only reordered; enforced by a test
(`lens.test.ts`) that fails if a lens's section list ever drops a key. No lens ever
filters areas by "fit" — lenses change presentation, never recommendations. Live on
both pilot full reports and coverage-tier snapshots. Renter/retiree lenses are a
natural fast-follow once there's renter- and retirement-specific data worth
reordering around (currently would just duplicate Family or Investor).

## Hard lines (unchanged)

No good/bad/safe labels; no demographic composition in any score or lens; trajectory
claims always carry their evidence.
