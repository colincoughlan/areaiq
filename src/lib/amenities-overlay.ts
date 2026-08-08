/**
 * Overlays real OSM amenity data (src/lib/generated/amenities.json, produced by
 * `npm run ingest:amenities`) onto an area's sample amenity detail.
 */

import amenitiesJson from "./generated/amenities.json";
import { CATEGORY_LABELS, type AmenityCategory, type AmenitySummary } from "./amenities";
import type { Area } from "./types";

interface AreaAmenities {
  source: string;
  retrievedAt: string;
  radiusMiles: number;
  summary: AmenitySummary;
}

interface AmenitiesFile {
  generatedAt: string | null;
  areas: Record<string, AreaAmenities>;
}

const AMENITIES: AmenitiesFile = amenitiesJson as unknown as AmenitiesFile;

const DISPLAY_ORDER: AmenityCategory[] = [
  "grocery",
  "food",
  "park",
  "pharmacy",
  "healthcare",
  "library",
  "fitness",
  "childcare",
  "transit",
];

export function amenitiesMeta(
  areaId: string
): { source: string; retrievedAt: string; radiusMiles: number } | null {
  const d = AMENITIES.areas[areaId];
  if (!d) return null;
  return { source: d.source, retrievedAt: d.retrievedAt, radiusMiles: d.radiusMiles };
}

/** Replaces sample amenityDetail rows with real OSM counts when available. */
export function withAmenities(area: Area): Area {
  const d = AMENITIES.areas[area.id];
  if (!d) return area;

  const rows: [string, string][] = [];
  for (const cat of DISPLAY_ORDER) {
    const s = d.summary[cat];
    if (!s || s.count === 0) continue;
    const nearest = s.examples[0];
    rows.push([
      CATEGORY_LABELS[cat],
      nearest ? `${s.count} (nearest: ${nearest.name}, ${nearest.distanceMiles} mi)` : String(s.count),
    ]);
  }
  if (rows.length === 0) return area;
  return { ...area, amenityDetail: rows };
}
