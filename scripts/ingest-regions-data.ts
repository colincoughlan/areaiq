/**
 * Bulk data ingestion for ALL SoCal regions. Usage:
 *   CENSUS_API_KEY=... npm run ingest:regions
 *
 * - ACS: ONE API call for every CA place, filtered to the registry.
 * - Schools: computed for every region center from the CDE directory
 *   (downloads unless CDE_FILE points at a local copy).
 *
 * Writes src/lib/generated/acs-regions.json and schools-regions.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACS_VARIABLES,
  deriveMetrics,
  moeVariable,
  normalizeResponse,
  type AreaAcsMetrics,
} from "../src/lib/acs";
import { nearbySchools, parseCdeTsv, type NearbySchool } from "../src/lib/schools";
import type { RegionEntry } from "../src/lib/regions-build";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGIONS_PATH = join(ROOT, "src/lib/generated/regions.json");
const ACS_OUT = join(ROOT, "src/lib/generated/acs-regions.json");
const SCHOOLS_OUT = join(ROOT, "src/lib/generated/schools-regions.json");
const CDE_URL = "https://www.cde.ca.gov/schooldirectory/report?rid=dl1&tp=txt";
const VINTAGE = Number(process.env.ACS_VINTAGE ?? 2024);

const KEY = process.env.CENSUS_API_KEY;
if (!KEY) {
  console.error("CENSUS_API_KEY is required (see .env.example).");
  process.exit(1);
}

async function main() {
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const { regions } = JSON.parse(readFileSync(REGIONS_PATH, "utf8")) as {
    regions: RegionEntry[];
  };
  const byFips = new Map(regions.map((r) => [r.placeFips, r]));
  console.log(`${regions.length} regions in registry`);

  // ---- ACS: one call for all CA places ----
  const fields = ["NAME", ...ACS_VARIABLES, ...ACS_VARIABLES.map(moeVariable)].join(",");
  const url = `https://api.census.gov/data/${VINTAGE}/acs/acs5?get=${fields}&for=place:*&in=state:06&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census API ${res.status}`);
  const rows = (await res.json()) as string[][];
  const header = rows[0];
  const placeIdx = header.indexOf("place");
  if (placeIdx === -1) throw new Error("Census response missing place column");

  const geos = normalizeResponse(rows);
  const period = `ACS ${VINTAGE - 4}-${VINTAGE} 5-year`;
  const acsOut: Record<string, AreaAcsMetrics> = {};
  let matched = 0;
  rows.slice(1).forEach((row, i) => {
    const region = byFips.get(row[placeIdx]);
    if (!region) return;
    acsOut[region.id] = deriveMetrics(geos[i], { period, retrievedAt });
    matched++;
  });
  console.log(`ACS: matched ${matched}/${regions.length} regions (${period})`);
  if (matched < regions.length * 0.95) {
    throw new Error("ACS matched fewer than 95% of regions — check FIPS alignment");
  }

  // ---- Schools: computed for every region center ----
  const cdeText = process.env.CDE_FILE
    ? readFileSync(process.env.CDE_FILE, "utf8")
    : await (async () => {
        console.log("Downloading CDE directory…");
        const r = await fetch(CDE_URL, { redirect: "follow" });
        if (!r.ok) throw new Error(`CDE ${r.status}`);
        return await r.text();
      })();
  const allSchools = parseCdeTsv(cdeText);
  console.log(`CDE: ${allSchools.length} rows`);

  const schoolsOut: Record<string, NearbySchool[]> = {};
  let withSchools = 0;
  for (const r of regions) {
    const nearby = nearbySchools(allSchools, { lat: r.lat, lng: r.lng }, 2.0, 5).map((s) => ({
      ...s,
      lat: Math.round(s.lat * 1e4) / 1e4,
      lng: Math.round(s.lng * 1e4) / 1e4,
    }));
    if (nearby.length > 0) {
      schoolsOut[r.id] = nearby;
      withSchools++;
    }
  }
  console.log(`Schools: ${withSchools}/${regions.length} regions have schools within 2 mi`);

  mkdirSync(dirname(ACS_OUT), { recursive: true });
  writeFileSync(
    ACS_OUT,
    JSON.stringify({ generatedAt: retrievedAt, vintage: VINTAGE, areas: acsOut }, null, 1) + "\n"
  );
  writeFileSync(
    SCHOOLS_OUT,
    JSON.stringify(
      {
        generatedAt: retrievedAt,
        source: "CA Dept. of Education school directory",
        radiusMiles: 2,
        areas: schoolsOut,
      },
      null,
      1
    ) + "\n"
  );
  console.log(`Wrote ${ACS_OUT}\nWrote ${SCHOOLS_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
