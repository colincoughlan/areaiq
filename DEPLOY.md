# Deploying AreaIQ

The app is a standard Next.js 14 project — Vercel is the zero-config path.

## Option A: Vercel via GitHub (recommended)

1. Push this folder to a GitHub repo (after copying the project to a local folder):
   ```bash
   git init -b main && git add -A && git commit -m "AreaIQ initial"
   ```
   ```bash
   git remote add origin https://github.com/<you>/areaiq.git
   git push -u origin main
   ```
2. At vercel.com → Add New Project → import the repo. Framework auto-detects.
3. Set environment variables in Vercel → Project → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY` — enables Ask AreaIQ (pilot areas)
   - `NEXT_PUBLIC_MAPBOX_TOKEN` — enables the interactive map
   - (`CENSUS_API_KEY` is only needed when running ingestion scripts, not at runtime)
4. Deploy. Every push to `main` redeploys.

## Option B: Vercel CLI (no GitHub)

```bash
npx vercel login
npx vercel --prod
```

## Data refresh (run locally, commit results)

Generated data ships with the repo — refresh on whatever cadence you like:

```bash
CENSUS_API_KEY=... npm run ingest:regions   # 334-place ACS + schools
CENSUS_API_KEY=... npm run ingest:acs       # pilot-area ACS
npm run ingest:permits                      # LA permits (Highland Park)
npm run ingest:schools                      # pilot-area schools
npm run ingest:amenities                    # pilot-area OSM POIs (resumable)
npm run build:regions                       # only if the place registry changes

# Housing-market data (Redfin Data Center, ~1GB download — run on your machine):
curl -o /tmp/redfin_city.gz "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/city_market_tracker.tsv000.gz"
REDFIN_FILE=/tmp/redfin_city.gz npm run ingest:market
```

Commit the updated `src/lib/generated/*.json` and push — the site redeploys with
fresh data and updated retrieval dates.

## Before public (non-beta) launch

- Fair-housing counsel review (see CLAUDE.md product rules)
- Replace the naive in-memory /api/ask rate limit with real infrastructure
- Domain + trademark check on the AreaIQ name
- Analytics (privacy-conscious) and error monitoring
- Move ingestion to scheduled jobs (GitHub Actions cron works at this scale)
