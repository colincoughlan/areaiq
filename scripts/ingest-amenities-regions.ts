/**
 * Amenity POI ingestion for ALL 334 SoCal regions (not just the 4 pilots).
 * Usage:
 *   npm run ingest:amenities-regions            # full run, resumable
 *   npm run ingest:amenities-regions -- --limit 20   # partial run, for testing
 *
 * One Overpass query per region, sequential, with a courtesy delay and
 * retry/backoff — same pattern as ingest-amenities.ts. This is a genuinely
 * long-running job (334 sequential live queries against a free public API
 * that is sometimes overloaded) — it writes after every region so an
 * interrupted run resumes instead of restarting. Expect anywhere from ~15
 * minutes (quiet server) to well over an hour (busy server, lots of
 * retries). Safe to stop and re-run at any time.
 *
 * Writes src/lib/generated/amenities-regions.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildOverpassQuery,
  summarizeAmenities,
  type AmenitySummary,
  type OverpassElement,
} from "../src/lib/amenities";
import type { RegionEntry } from "../src/lib/regions-build";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGIONS_PATH = join(ROOT, "src/lib/generated/regions.json");
const OUT_PATH = join(ROOT, "src/lib/generated/amenities-regions.json");
const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const RADIUS_METERS = 3218; // 2 miles, matching the pilot-area radius

export interface RegionAmenities {
  retrievedAt: string;
  summary: AmenitySummary;
}

async function fetchRegion(lat: number, lng: number): Promise<OverpassElement[]> {
  const body = `data=${encodeURIComponent(buildOverpassQuery(lat, lng, RADIUS_METERS))}`;
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "*/*",
        "user-agent": "AreaIQ/0.1 (contact: dev@areaiq.example)",
      },
      body,
    });
    if (res.ok) {
      const data = (await res.json()) as { elements?: OverpassElement[] };
      return data.elements ?? [];
    }
    lastErr = `Overpass ${res.status}: ${(await res.text()).slice(0, 120)}`;
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 8000));
  }
  throw new Error(lastErr);
}

function parseLimit(): number | null {
  const i = process.argv.indexOf("--limit");
  if (i === -1) return null;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function main() {
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const force = process.argv.includes("--force");
  const limit = parseLimit();

  const { regions } = JSON.parse(readFileSync(REGIONS_PATH, "utf8")) as { regions: RegionEntry[] };
  console.log(`${regions.length} regions in registry${limit ? ` (limiting this run to ${limit})` : ""}`);

  let out: Record<string, RegionAmenities> = {};
  if (existsSync(OUT_PATH) && !force) {
    try {
      out = (JSON.parse(readFileSync(OUT_PATH, "utf8")) as { areas: typeof out }).areas ?? {};
    } catch {
      out = {};
    }
  }

  let fetchedThisRun = 0;
  let errors = 0;
  for (const region of regions) {
    if (limit != null && fetchedThisRun >= limit) break;
    if (out[region.id] && !force) continue; // resumable: skip already-fetched regions

    try {
      const elements = await fetchRegion(region.lat, region.lng);
      const summary = summarizeAmenities(elements, { lat: region.lat, lng: region.lng });
      out[region.id] = { retrievedAt, summary };
      const counts = Object.entries(summary).map(([k, v]) => `${k}:${v!.count}`).join(" ") || "none";
      console.log(`✓ ${region.id}: ${elements.length} POIs → ${counts}`);
    } catch (err) {
      errors++;
      console.error(`✗ ${region.id}: ${err instanceof Error ? err.message : err}`);
    }

    fetchedThisRun++;
    // Write after every region so an interrupted run resumes instead of restarting.
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(
      OUT_PATH,
      JSON.stringify(
        { generatedAt: retrievedAt, source: "© OpenStreetMap contributors (Overpass API)", radiusMiles: 2, areas: out },
        null,
        1
      ) + "\n"
    );
    await new Promise((r) => setTimeout(r, 2000)); // courtesy delay for the public server
  }

  console.log(
    `\nDone this run: ${fetchedThisRun} regions attempted, ${errors} failed. ` +
      `${Object.keys(out).length}/${regions.length} total regions have amenity data.`
  );
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
