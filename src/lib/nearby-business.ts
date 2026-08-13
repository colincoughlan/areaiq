/**
 * Pure logic for on-demand "is there a competing X nearby" business search,
 * backed by live OpenStreetMap/Overpass data (same source as the amenities
 * pipeline). No I/O here — the API route in src/app/api/nearby-business/
 * does fetching; these functions are unit-tested.
 *
 * Deliberately deterministic and un-AI'd: a direct tag/name lookup can't
 * hallucinate a competitor that doesn't exist, which matters a lot for a
 * "how much competition would I have" question. See docs/specs/
 * nearby-business-search.md.
 */

import { haversineMiles } from "./schools";

export interface BusinessCategory {
  key: string;
  label: string;
  /** Keywords that route a free-text search to this category's precise tags. */
  keywords: string[];
  /** Overpass tag filter fragments, e.g. ["amenity"="dancing_school"]. */
  filters: string[];
}

/** Curated categories with precise OSM tags, seeded from the LA-area dance-
 * school probe (docs/specs/nearby-business-search.md) plus adjacent
 * kid-activity / personal-service categories real buyers ask about.
 * Not exhaustive — free text outside this list falls back to a name search. */
export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    key: "dance",
    label: "Dance schools & studios",
    keywords: ["dance", "dance school", "dance studio", "ballet"],
    filters: [`["amenity"="dancing_school"]`, `["leisure"="dance"]`, `["shop"="dance"]`],
  },
  {
    key: "martial-arts",
    label: "Martial arts schools",
    keywords: ["martial arts", "karate", "taekwondo", "jiu jitsu", "jiujitsu", "judo", "kung fu"],
    filters: [`["sport"="martial_arts"]`, `["shop"="martial_arts"]`],
  },
  {
    key: "gymnastics",
    label: "Gymnastics & tumbling",
    keywords: ["gymnastics", "tumbling", "cheer", "cheerleading"],
    filters: [`["sport"="gymnastics"]`],
  },
  {
    key: "swim",
    label: "Swim schools",
    keywords: ["swim", "swim school", "swim lessons", "swimming"],
    filters: [`["sport"="swimming"]["leisure"="sports_centre"]`, `["amenity"="swimming_pool"]`],
  },
  {
    key: "music-lessons",
    label: "Music lessons & schools",
    keywords: ["music lessons", "music school", "piano lessons", "guitar lessons"],
    filters: [`["shop"="music"]`, `["amenity"="music_school"]`],
  },
  {
    key: "tutoring",
    label: "Tutoring & test prep",
    keywords: ["tutoring", "tutor", "test prep", "learning center"],
    filters: [`["office"="educational_institution"]`, `["amenity"="prep_school"]`],
  },
  {
    key: "gym",
    label: "Gyms & fitness studios",
    keywords: ["gym", "fitness", "yoga", "pilates", "crossfit", "yoga studio"],
    filters: [`["leisure"="fitness_centre"]`, `["sport"="yoga"]`, `["sport"="pilates"]`],
  },
  {
    key: "preschool",
    label: "Preschools & childcare",
    keywords: ["preschool", "daycare", "childcare", "montessori"],
    filters: [`["amenity"="childcare"]`, `["amenity"="kindergarten"]`],
  },
  {
    key: "salon",
    label: "Hair & nail salons",
    keywords: ["salon", "hair salon", "nail salon", "barber", "barbershop"],
    filters: [`["shop"="hairdresser"]`, `["shop"="beauty"]`, `["shop"="nail"]`],
  },
];

export function findCategory(term: string): BusinessCategory | null {
  const t = term.trim().toLowerCase();
  if (!t) return null;
  for (const cat of BUSINESS_CATEGORIES) {
    if (cat.keywords.some((k) => t.includes(k) || k.includes(t))) return cat;
  }
  return null;
}

/** Overpass QL for a business search. Single-line — see amenities.ts note on
 * why (embedded newlines cause Overpass to return HTTP 406). */
export function buildBusinessQuery(
  term: string,
  lat: number,
  lng: number,
  radiusMeters: number
): { query: string; category: BusinessCategory | null } {
  const around = `around:${radiusMeters},${lat},${lng}`;
  const category = findCategory(term);
  const escaped = term.trim().replace(/["\\]/g, "");

  if (category) {
    const tagClauses = category.filters.map((f) => `nwr${f}(${around});`).join("");
    const nameClause = escaped ? `nwr["name"~"${escaped}",i](${around});` : "";
    return {
      query: `[out:json][timeout:25];(${tagClauses}${nameClause});out center tags;`,
      category,
    };
  }

  // Unrecognized category: name-text search across common POI tag keys.
  const nameClause = `nwr["name"~"${escaped}",i](${around});`;
  return { query: `[out:json][timeout:25];(${nameClause});out center tags;`, category: null };
}

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface BusinessResult {
  name: string;
  distanceMiles: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  /** "tagged": matched a known business-category tag. "name": matched only
   * because the search term appears in the listing's name — verify it's
   * actually the right kind of business before trusting it as a competitor. */
  matchType: "tagged" | "name";
  tags: Record<string, string>;
}

function formatAddress(tags: Record<string, string>): string | null {
  const num = tags["addr:housenumber"];
  const street = tags["addr:street"];
  if (num && street) return `${num} ${street}`;
  if (street) return street;
  return null;
}

export function parseBusinessResults(
  elements: OverpassElement[],
  center: { lat: number; lng: number },
  category: BusinessCategory | null,
  limit = 15
): BusinessResult[] {
  const seen = new Set<string>();
  const out: BusinessResult[] = [];

  for (const el of elements) {
    if (!el.tags?.name) continue; // unnamed POIs aren't useful as "competitors"
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const tagged = category != null && category.filters.length > 0 && isTagMatch(el.tags, category);

    out.push({
      name: el.tags.name,
      distanceMiles: Math.round(haversineMiles(center.lat, center.lng, lat, lon) * 10) / 10,
      address: formatAddress(el.tags),
      phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
      website: el.tags.website ?? el.tags["contact:website"] ?? null,
      matchType: tagged ? "tagged" : "name",
      tags: el.tags,
    });
  }

  return out.sort((a, z) => a.distanceMiles - z.distanceMiles).slice(0, limit);
}

function isTagMatch(tags: Record<string, string>, category: BusinessCategory): boolean {
  // Cheap re-check against the same key/value pairs used to build the query filters.
  // A filter string may chain multiple ["k"="v"] clauses (AND); the filter
  // matches only if every clause it contains is satisfied.
  return category.filters.some((f) => {
    const clauses = [...f.matchAll(/\["(\w+)"="([^"]+)"\]/g)];
    if (clauses.length === 0) return false;
    return clauses.every(([, k, v]) => tags[k] === v);
  });
}
