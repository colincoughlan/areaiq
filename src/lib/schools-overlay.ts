/**
 * Overlays real CDE school data (src/lib/generated/schools.json, produced by
 * `npm run ingest:schools`) onto an area's sample school list.
 */

import schoolsJson from "./generated/schools.json";
import { schoolOutcomeText } from "./outcomes-overlay";
import type { NearbySchool } from "./schools";
import type { Area } from "./types";

interface AreaSchools {
  source: string;
  retrievedAt: string;
  radiusMiles: number;
  schools: NearbySchool[];
}

interface SchoolsFile {
  generatedAt: string | null;
  areas: Record<string, AreaSchools>;
}

const SCHOOLS: SchoolsFile = schoolsJson as unknown as SchoolsFile;

export function schoolsMeta(
  areaId: string
): { source: string; retrievedAt: string; radiusMiles: number } | null {
  const d = SCHOOLS.areas[areaId];
  if (!d) return null;
  return { source: d.source, retrievedAt: d.retrievedAt, radiusMiles: d.radiusMiles };
}

/** Replaces sample schools with real nearby schools when available. */
export function withSchools(area: Area): Area {
  const d = SCHOOLS.areas[area.id];
  if (!d || d.schools.length === 0) return area;
  return {
    ...area,
    schools: d.schools.map((s) => ({
      name: s.name,
      district: s.district,
      note: [
        s.socType,
        `grades ${s.grades}`,
        `${s.distanceMiles} mi`,
        s.charter ? "charter" : null,
        s.magnet ? "magnet" : null,
        schoolOutcomeText(s.cdsCode),
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  };
}
