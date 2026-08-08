/**
 * Pure logic for OSM amenity ingestion. No I/O — fetching lives in
 * scripts/ingest-amenities.ts. Unit-tested.
 */

import { haversineMiles } from "./schools";

export type AmenityCategory =
  | "grocery"
  | "pharmacy"
  | "food"
  | "park"
  | "library"
  | "healthcare"
  | "fitness"
  | "childcare"
  | "transit";

export const CATEGORY_LABELS: Record<AmenityCategory, string> = {
  grocery: "Grocery stores",
  pharmacy: "Pharmacies",
  food: "Restaurants & cafés",
  park: "Parks",
  library: "Libraries",
  healthcare: "Clinics & hospitals",
  fitness: "Fitness centers",
  childcare: "Childcare & preschools",
  transit: "Transit stations",
};

/** Map OSM tags to an AreaIQ category. Order matters: first match wins. */
export function categorize(tags: Record<string, string>): AmenityCategory | null {
  const { shop, amenity, leisure, railway, public_transport } = tags;
  if (shop === "supermarket" || shop === "grocery" || shop === "greengrocer") return "grocery";
  if (amenity === "pharmacy") return "pharmacy";
  if (amenity === "restaurant" || amenity === "cafe" || amenity === "fast_food") return "food";
  if (leisure === "park") return "park";
  if (amenity === "library") return "library";
  if (amenity === "clinic" || amenity === "doctors" || amenity === "hospital")
    return "healthcare";
  if (leisure === "fitness_centre") return "fitness";
  if (amenity === "childcare" || amenity === "kindergarten") return "childcare";
  if (railway === "station" || public_transport === "station") return "transit";
  return null;
}

/** Raw Overpass element (subset). Ways/relations carry a `center`. */
export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface AmenityExample {
  name: string;
  distanceMiles: number;
}

export interface CategorySummary {
  count: number;
  examples: AmenityExample[]; // nearest named, up to 3
}

export type AmenitySummary = Partial<Record<AmenityCategory, CategorySummary>>;

export function summarizeAmenities(
  elements: OverpassElement[],
  center: { lat: number; lng: number },
  examplesPerCategory = 3
): AmenitySummary {
  const buckets = new Map<AmenityCategory, { count: number; named: AmenityExample[] }>();
  const seen = new Set<string>();

  for (const el of elements) {
    if (!el.tags) continue;
    const cat = categorize(el.tags);
    if (!cat) continue;
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const bucket = buckets.get(cat) ?? { count: 0, named: [] };
    bucket.count += 1;
    const name = el.tags.name;
    if (name) {
      bucket.named.push({
        name,
        distanceMiles: Math.round(haversineMiles(center.lat, center.lng, lat, lon) * 10) / 10,
      });
    }
    buckets.set(cat, bucket);
  }

  const out: AmenitySummary = {};
  for (const [cat, b] of buckets) {
    out[cat] = {
      count: b.count,
      examples: b.named.sort((a, z) => a.distanceMiles - z.distanceMiles).slice(0, examplesPerCategory),
    };
  }
  return out;
}

export function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  const around = `around:${radiusMeters},${lat},${lng}`;
  // Single line: newlines in the urlencoded body make Overpass return 406.
  return (
    `[out:json][timeout:60];(` +
    `nwr["shop"~"^(supermarket|grocery|greengrocer)$"](${around});` +
    `nwr["amenity"~"^(pharmacy|restaurant|cafe|fast_food|library|clinic|doctors|hospital|childcare|kindergarten)$"](${around});` +
    `nwr["leisure"~"^(park|fitness_centre)$"](${around});` +
    `nwr["railway"="station"](${around});` +
    `nwr["public_transport"="station"](${around});` +
    `);out center;`
  );
}
