/**
 * Housing-market data ingestion from Redfin's public Data Center. Usage:
 *   REDFIN_FILE=/path/to/city_market_tracker.tsv000.gz npm run ingest:market
 *
 * The source file is ~1GB gzipped (all US cities, monthly history) — this
 * streams it, keeps the latest all-residential row per SoCal region, and writes
 * a small src/lib/generated/market.json. Attribution required and carried:
 * "Data from Redfin, a national real estate brokerage".
 */

import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RegionEntry } from "../src/lib/regions-build";
import type { MarketMetrics } from "../src/lib/market-overlay";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src/lib/generated/market.json");
const REGIONS_PATH = join(ROOT, "src/lib/generated/regions.json");

const num = (v: string | undefined): number | null => {
  if (v == null || v === "" || v === "NA") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

async function main() {
  const file = process.env.REDFIN_FILE;
  if (!file) {
    console.error("Set REDFIN_FILE to the downloaded city_market_tracker.tsv000.gz");
    process.exit(1);
  }
  const { regions } = JSON.parse(readFileSync(REGIONS_PATH, "utf8")) as {
    regions: RegionEntry[];
  };
  // Redfin city names match our place names for incorporated cities.
  const byName = new Map(regions.map((r) => [r.name.toLowerCase(), r.id]));

  const rl = createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  let header: string[] | null = null;
  let idx: Record<string, number> = {};
  const latest: Record<string, MarketMetrics & { _period: string }> = {};
  let rows = 0;

  for await (const line of rl) {
    if (!header) {
      header = line.split("\t").map((h) => h.replace(/^"|"$/g, ""));
      for (const [i, h] of header.entries()) idx[h] = i;
      for (const req of ["state_code", "city", "property_type", "period_end", "median_sale_price"]) {
        if (!(req in idx)) throw new Error(`Redfin file missing column: ${req}`);
      }
      continue;
    }
    rows++;
    const f = line.split("\t").map((v) => v.replace(/^"|"$/g, ""));
    if (f[idx.state_code] !== "CA") continue;
    if (f[idx.property_type] !== "All Residential") continue;
    const regionId = byName.get((f[idx.city] ?? "").toLowerCase());
    if (!regionId) continue;

    const period = f[idx.period_end];
    const existing = latest[regionId];
    if (existing && existing._period >= period) continue;
    latest[regionId] = {
      _period: period,
      periodEnd: period,
      medianSalePrice: num(f[idx.median_sale_price]),
      medianSalePriceYoY: num(f[idx.median_sale_price_yoy]),
      medianDom: num(f[idx.median_dom]),
      homesSold: num(f[idx.homes_sold]),
      inventory: num(f[idx.inventory]),
    };
  }

  const areas: Record<string, MarketMetrics> = {};
  for (const [id, m] of Object.entries(latest)) {
    const { _period, ...rest } = m;
    void _period;
    if (rest.medianSalePrice != null) areas[id] = rest;
  }

  console.log(`Scanned ${rows} rows → market data for ${Object.keys(areas).length} SoCal cities`);
  if (Object.keys(areas).length < 50) {
    throw new Error("Matched suspiciously few cities — check name joining before writing.");
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        source: "Data from Redfin, a national real estate brokerage",
        areas,
      },
      null,
      1
    ) + "\n"
  );
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
