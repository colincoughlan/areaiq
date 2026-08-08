/**
 * Pure logic for CDE school-directory ingestion. No I/O — the CLI in
 * scripts/ingest-schools.ts downloads; these functions are unit-tested.
 */

export interface CdeSchool {
  cdsCode: string;
  name: string;
  district: string;
  status: string;
  socType: string;
  grades: string;
  charter: boolean;
  magnet: boolean;
  virtual: string;
  lat: number;
  lng: number;
}

/** Haversine distance in miles. */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.7613;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Parse the CDE tab-delimited file. Columns are resolved by header name so a
 * CDE column reorder doesn't silently corrupt the data.
 */
export function parseCdeTsv(text: string): CdeSchool[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) throw new Error("CDE file has no data rows");
  const header = lines[0].split("\t");
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`CDE file missing column: ${name}`);
    return i;
  };
  const iCds = col("CDSCode");
  const iStatus = col("StatusType");
  const iDistrict = col("District");
  const iSchool = col("School");
  const iSoc = col("SOCType");
  const iGrades = col("GSoffered");
  const iCharter = col("Charter");
  const iMagnet = col("Magnet");
  const iVirtual = col("Virtual");
  const iLat = col("Latitude");
  const iLng = col("Longitude");

  const out: CdeSchool[] = [];
  for (const line of lines.slice(1)) {
    const f = line.split("\t");
    const lat = Number(f[iLat]);
    const lng = Number(f[iLng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      cdsCode: f[iCds] ?? "",
      name: f[iSchool] ?? "",
      district: f[iDistrict] ?? "",
      status: f[iStatus] ?? "",
      socType: f[iSoc] ?? "",
      grades: f[iGrades] ?? "",
      charter: f[iCharter] === "Y",
      magnet: f[iMagnet] === "Y",
      virtual: f[iVirtual] ?? "",
      lat,
      lng,
    });
  }
  return out;
}

const INSTRUCTIONAL_TYPES = /(elementary|middle|junior|high school|k-12)/i;

/** Active, physical, instructional schools only. */
export function isNeighborhoodSchool(s: CdeSchool): boolean {
  if (s.status !== "Active") return false;
  if (!INSTRUCTIONAL_TYPES.test(s.socType)) return false;
  if (/exclusively virtual/i.test(s.virtual) || s.virtual === "F") return false;
  if (!s.name || s.name === "No Data") return false;
  return true;
}

export interface NearbySchool {
  cdsCode: string;
  name: string;
  district: string;
  socType: string;
  grades: string;
  charter: boolean;
  magnet: boolean;
  distanceMiles: number;
  lat: number;
  lng: number;
}

export function nearbySchools(
  schools: CdeSchool[],
  center: { lat: number; lng: number },
  radiusMiles = 2.0,
  limit = 8
): NearbySchool[] {
  return schools
    .filter(isNeighborhoodSchool)
    .map((s) => ({
      cdsCode: s.cdsCode,
      name: s.name,
      district: s.district,
      socType: s.socType.replace(/ \(Public\)$/, ""),
      grades: s.grades,
      charter: s.charter,
      magnet: s.magnet,
      distanceMiles: Math.round(haversineMiles(center.lat, center.lng, s.lat, s.lng) * 10) / 10,
      lat: s.lat,
      lng: s.lng,
    }))
    .filter((s) => s.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit);
}
