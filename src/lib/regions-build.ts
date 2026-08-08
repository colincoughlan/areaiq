/**
 * Pure logic for building the SoCal region registry: gazetteer parsing,
 * point-in-polygon county assignment, slug generation. Unit-tested.
 */

export const SOCAL_COUNTIES: Record<string, string> = {
  "06037": "Los Angeles County",
  "06059": "Orange County",
  "06065": "Riverside County",
  "06071": "San Bernardino County",
  "06111": "Ventura County",
};

export interface GazetteerPlace {
  geoid: string; // "0644000"
  placeFips: string; // "44000"
  name: string; // "Los Angeles city" -> cleaned to "Los Angeles"
  kind: "city" | "cdp";
  lat: number;
  lng: number;
}

export function parseGazetteer(text: string): GazetteerPlace[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split("\t").map((h) => h.trim());
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`Gazetteer missing column: ${name}`);
    return i;
  };
  const iGeoid = col("GEOID");
  const iName = col("NAME");
  const iLat = col("INTPTLAT");
  const iLng = col("INTPTLONG");

  const out: GazetteerPlace[] = [];
  for (const line of lines.slice(1)) {
    const f = line.split("\t").map((v) => v.trim());
    const geoid = f[iGeoid];
    const rawName = f[iName];
    const lat = Number(f[iLat]);
    const lng = Number(f[iLng]);
    if (!geoid || geoid.length !== 7 || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const isCdp = / CDP$/i.test(rawName);
    out.push({
      geoid,
      placeFips: geoid.slice(2),
      name: rawName.replace(/ (city|town|CDP)$/i, ""),
      kind: isCdp ? "cdp" : "city",
      lat,
      lng,
    });
  }
  return out;
}

/** Ray-casting point-in-polygon. Ring: [[lng,lat], ...]. */
export function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

/** First ring is the outer boundary; holes are rare for counties and ignored. */
export function pointInGeometry(lng: number, lat: number, geom: GeoJsonGeometry): boolean {
  if (geom.type === "Polygon") return pointInRing(lng, lat, geom.coordinates[0]);
  return geom.coordinates.some((poly) => pointInRing(lng, lat, poly[0]));
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface RegionEntry {
  id: string; // slug, unique
  name: string;
  kind: "city" | "cdp";
  county: string;
  countyFips: string;
  placeFips: string;
  lat: number;
  lng: number;
}

export function assignCounties(
  places: GazetteerPlace[],
  countyGeoms: Record<string, GeoJsonGeometry>
): RegionEntry[] {
  const out: RegionEntry[] = [];
  const used = new Set<string>();
  for (const p of places) {
    let countyFips: string | null = null;
    for (const [fips, geom] of Object.entries(countyGeoms)) {
      if (pointInGeometry(p.lng, p.lat, geom)) {
        countyFips = fips;
        break;
      }
    }
    if (!countyFips) continue;
    let id = slugify(p.name);
    if (used.has(id)) id = `${id}-${slugify(SOCAL_COUNTIES[countyFips].replace(" County", ""))}`;
    if (used.has(id)) id = `${id}-${p.placeFips}`;
    used.add(id);
    out.push({
      id,
      name: p.name,
      kind: p.kind,
      county: SOCAL_COUNTIES[countyFips],
      countyFips,
      placeFips: p.placeFips,
      lat: p.lat,
      lng: p.lng,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
