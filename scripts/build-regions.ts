/**
 * Region registry builder. Usage:
 *   npm run build:regions
 *
 * Downloads the Census place gazetteer (CA) and county boundary GeoJSON,
 * assigns each place to a SoCal county via point-in-polygon, and writes
 * src/lib/generated/regions.json. Env: GAZ_FILE / COUNTIES_FILE to use
 * local copies.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assignCounties,
  parseGazetteer,
  SOCAL_COUNTIES,
} from "../src/lib/regions-build";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src/lib/generated/regions.json");
const GAZ_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_gaz_place_06.txt";
const COUNTIES_URL =
  "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";

async function loadText(envVar: string, url: string): Promise<string> {
  const local = process.env[envVar];
  if (local) return readFileSync(local, "utf8");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return await res.text();
}

async function main() {
  const [gazText, countiesText] = await Promise.all([
    loadText("GAZ_FILE", GAZ_URL),
    loadText("COUNTIES_FILE", COUNTIES_URL),
  ]);

  const places = parseGazetteer(gazText);
  console.log(`Parsed ${places.length} CA places`);

  const geo = JSON.parse(countiesText) as {
    features: { id: string; geometry: never }[];
  };
  const countyGeoms: Record<string, never> = {} as never;
  for (const f of geo.features) {
    if (SOCAL_COUNTIES[f.id]) (countyGeoms as Record<string, unknown>)[f.id] = f.geometry;
  }
  if (Object.keys(countyGeoms).length !== 5) {
    throw new Error(`Expected 5 county polygons, got ${Object.keys(countyGeoms).length}`);
  }

  const regions = assignCounties(places, countyGeoms);
  const byCounty: Record<string, number> = {};
  for (const r of regions) byCounty[r.county] = (byCounty[r.county] ?? 0) + 1;
  console.log(`Assigned ${regions.length} places:`, byCounty);

  // Sanity: known cities must be present in the right county
  const must: [string, string][] = [
    ["Los Angeles", "Los Angeles County"],
    ["Irvine", "Orange County"],
    ["Riverside", "Riverside County"],
    ["Fontana", "San Bernardino County"],
    ["Ventura", "Ventura County"],
    ["Eastvale", "Riverside County"],
    ["Claremont", "Los Angeles County"],
  ];
  for (const [name, county] of must) {
    const hit = regions.find((r) => r.name === name || (name === "Ventura" && r.name.includes("Buenaventura")));
    if (!hit) throw new Error(`Sanity check failed: ${name} missing from registry`);
    if (hit.county !== county) throw new Error(`Sanity check failed: ${name} → ${hit.county}, expected ${county}`);
  }
  console.log("Sanity checks passed");

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), regions }, null, 1) + "\n"
  );
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
