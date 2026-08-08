/**
 * School-directory ingestion CLI. Usage:
 *   npm run ingest:schools
 *
 * Downloads the CDE public-school directory (or reads CDE_FILE if set), selects
 * nearby active schools for each pilot area, writes src/lib/generated/schools.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS } from "../src/lib/areas";
import { nearbySchools, parseCdeTsv, type NearbySchool } from "../src/lib/schools";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src/lib/generated/schools.json");
const CDE_URL = "https://www.cde.ca.gov/schooldirectory/report?rid=dl1&tp=txt";

export interface AreaSchools {
  source: string;
  retrievedAt: string;
  radiusMiles: number;
  schools: NearbySchool[];
}

async function loadDirectory(): Promise<string> {
  if (process.env.CDE_FILE) {
    console.log(`Reading ${process.env.CDE_FILE}`);
    return readFileSync(process.env.CDE_FILE, "utf8");
  }
  console.log("Downloading CDE school directory…");
  const res = await fetch(CDE_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`CDE download failed: ${res.status}`);
  return await res.text();
}

async function main() {
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const text = await loadDirectory();
  const all = parseCdeTsv(text);
  console.log(`Parsed ${all.length} rows with coordinates`);

  const radiusMiles = 2.0;
  const out: Record<string, AreaSchools> = {};
  for (const [areaId, area] of Object.entries(AREAS)) {
    const schools = nearbySchools(all, { lat: area.lat, lng: area.lng }, radiusMiles);
    if (schools.length === 0) {
      console.warn(`⚠ ${areaId}: no schools within ${radiusMiles} mi — check center coords`);
      continue;
    }
    out[areaId] = {
      source: "CA Dept. of Education school directory",
      retrievedAt,
      radiusMiles,
      schools,
    };
    console.log(`✓ ${areaId}: ${schools.length} schools within ${radiusMiles} mi`);
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: retrievedAt, areas: out }, null, 2) + "\n");
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
