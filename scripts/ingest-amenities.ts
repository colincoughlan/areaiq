/**
 * Amenity POI ingestion CLI. Usage:
 *   npm run ingest:amenities
 *
 * One Overpass query per pilot area (sequential, with courtesy delay).
 * Writes src/lib/generated/amenities.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS } from "../src/lib/areas";
import {
  buildOverpassQuery,
  summarizeAmenities,
  type AmenitySummary,
  type OverpassElement,
} from "../src/lib/amenities";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src/lib/generated/amenities.json");
const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const RADIUS_METERS = 3218; // 2 miles, matching the schools radius

export interface AreaAmenities {
  source: string;
  retrievedAt: string;
  radiusMiles: number;
  summary: AmenitySummary;
}

async function fetchArea(lat: number, lng: number): Promise<OverpassElement[]> {
  const body = `data=${encodeURIComponent(buildOverpassQuery(lat, lng, RADIUS_METERS))}`;
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "*/*",
        // OSM policy: identify the application (contact form required by some mirrors)
        "user-agent": "AreaIQ/0.1 (contact: dev@areaiq.example)",
      },
      body,
    });
    if (res.ok) {
      const data = (await res.json()) as { elements?: OverpassElement[] };
      return data.elements ?? [];
    }
    lastErr = `Overpass ${res.status}: ${(await res.text()).slice(0, 120)}`;
    // 429/504 are load-shedding on the public server — back off and retry
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 8000));
  }
  throw new Error(lastErr);
}

async function main() {
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const force = process.argv.includes("--force");

  // Resumable: merge into the existing file, skip areas already fetched today.
  let out: Record<string, AreaAmenities> = {};
  if (existsSync(OUT_PATH) && !force) {
    try {
      out = (JSON.parse(readFileSync(OUT_PATH, "utf8")) as { areas: typeof out }).areas ?? {};
    } catch {
      out = {};
    }
  }

  for (const [areaId, area] of Object.entries(AREAS)) {
    if (out[areaId] && !force) {
      console.log(`- ${areaId}: already fetched (${out[areaId].retrievedAt}), skipping`);
      continue;
    }
    const elements = await fetchArea(area.lat, area.lng);
    const summary = summarizeAmenities(elements, { lat: area.lat, lng: area.lng });
    const counts = Object.entries(summary)
      .map(([k, v]) => `${k}:${v!.count}`)
      .join(" ");
    if (!summary.grocery && !summary.food) {
      console.warn(`⚠ ${areaId}: no grocery/food POIs — check coordinates or OSM coverage`);
    }
    out[areaId] = {
      source: "© OpenStreetMap contributors (Overpass API)",
      retrievedAt,
      radiusMiles: 2,
      summary,
    };
    console.log(`✓ ${areaId}: ${elements.length} POIs → ${counts}`);
    // Write after every area so interrupted runs resume instead of restarting.
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: retrievedAt, areas: out }, null, 2) + "\n");
    await new Promise((r) => setTimeout(r, 2000)); // courtesy delay for public server
  }

  writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: retrievedAt, areas: out }, null, 2) + "\n");
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
