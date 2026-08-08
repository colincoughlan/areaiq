/**
 * ACS ingestion CLI. Usage:
 *   CENSUS_API_KEY=... npm run ingest:acs
 *
 * Fetches ACS 5-year estimates for each pilot geography, validates the returned
 * NAME (guards wrong FIPS), derives metrics with MOE-based confidence, and
 * writes src/lib/generated/acs.json for the app to overlay.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACS_VARIABLES,
  aggregateTracts,
  deriveMetrics,
  GEOGRAPHIES,
  moeVariable,
  normalizeResponse,
  type AreaAcsMetrics,
  type Geo,
} from "../src/lib/acs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src/lib/generated/acs.json");
const VINTAGES = [2024, 2023];

const KEY = process.env.CENSUS_API_KEY;
if (!KEY) {
  console.error(
    "CENSUS_API_KEY is not set. Get a free key at https://api.census.gov/data/key_signup.html\n" +
      "then run:  CENSUS_API_KEY=yourkey npm run ingest:acs"
  );
  process.exit(1);
}

const fields = ["NAME", ...ACS_VARIABLES, ...ACS_VARIABLES.map(moeVariable)].join(",");

function geoQuery(geo: Geo): string {
  if (geo.kind === "place") {
    return `for=place:${geo.place}&in=state:${geo.state}`;
  }
  return `for=tract:${geo.tracts.join(",")}&in=state:${geo.state}%20county:${geo.county}`;
}

async function fetchVintage(vintage: number, geo: Geo): Promise<string[][] | null> {
  const url =
    `https://api.census.gov/data/${vintage}/acs/acs5?get=${fields}&${geoQuery(geo)}&key=${KEY}`;
  const res = await fetch(url, { redirect: "manual" });
  if (res.status === 404) return null; // vintage not published
  if (res.headers.get("X-DataWebAPI-KeyError") || res.status === 302) {
    throw new Error(
      "Census API rejected the key (invalid or not yet activated). " +
        "Click the activation link in the email from the Census Bureau, wait a minute, and retry."
    );
  }
  if (!res.ok) {
    throw new Error(`Census API ${res.status} for ${url.replace(KEY!, "***")}`);
  }
  const text = await res.text();
  if (!text.trimStart().startsWith("[")) {
    throw new Error(`Census API returned non-JSON (first 120 chars): ${text.slice(0, 120)}`);
  }
  return JSON.parse(text) as string[][];
}

async function main() {
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const areas: Record<string, AreaAcsMetrics> = {};
  let vintageUsed: number | null = null;

  for (const [areaId, geo] of Object.entries(GEOGRAPHIES)) {
    let rows: string[][] | null = null;
    const candidates: number[] = vintageUsed ? [vintageUsed] : [...VINTAGES];
    for (const vintage of candidates) {
      rows = await fetchVintage(vintage, geo);
      if (rows) {
        vintageUsed = vintage;
        break;
      }
    }
    if (!rows || !vintageUsed) {
      throw new Error(`No ACS vintage available (tried ${VINTAGES.join(", ")})`);
    }

    const period = `ACS ${vintageUsed - 4}-${vintageUsed} 5-year`;
    const geos = normalizeResponse(rows);

    if (geo.kind === "place") {
      const g = geos[0];
      if (!g.name.includes(geo.expectName)) {
        throw new Error(
          `FIPS mismatch for ${areaId}: expected NAME containing "${geo.expectName}", got "${g.name}". Refusing to write.`
        );
      }
      areas[areaId] = deriveMetrics(g, { period, retrievedAt, scopeNote: geo.scopeNote });
      console.log(`✓ ${areaId}: ${g.name} (${period})`);
    } else {
      if (geo.provisional) {
        console.warn(
          `⚠ ${areaId}: tract list is PROVISIONAL — verify boundaries before publishing.`
        );
      }
      if (geos.length !== geo.tracts.length) {
        console.warn(
          `⚠ ${areaId}: requested ${geo.tracts.length} tracts, got ${geos.length}. Check tract ids.`
        );
      }
      const agg = aggregateTracts(geos);
      areas[areaId] = deriveMetrics(agg, { period, retrievedAt, provisional: geo.provisional });
      console.log(`✓ ${areaId}: aggregated ${geos.length} tracts (${period})`);
    }
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ generatedAt: retrievedAt, vintage: vintageUsed, areas }, null, 2) + "\n"
  );
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
