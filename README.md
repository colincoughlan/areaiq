# AreaIQ

Know the neighborhood before you buy. Phase 1: functional prototype with sample data for four Southern California pilot areas.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional: real maps. Copy `.env.example` to `.env.local` and add a Mapbox token (free tier is fine). Without a token the app shows a static map placeholder — everything else works.

## Scripts

`npm run dev` · `npm run build` · `npm run typecheck` · `npm run test`

## What's here

- Address search (autocomplete over pilot areas) → summary card → full Area Intelligence Report
- Interactive Mapbox map with amenity/school/development layers
- Two-area comparison
- Component scores (Daily Life, Housing, FutureScore) with confidence labels — deliberately no single composite score
- Supabase/PostGIS schema in `supabase/migrations/` (not yet wired; Phase 2)

All neighborhood figures are **illustrative sample data** for usability validation. See `CLAUDE.md` for product rules and phase plan.
