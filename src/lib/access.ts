/**
 * 15-minute neighborhood access: how many daily essentials sit within a
 * 15-minute walk (~1 mile) of the area center. Our transparent alternative to
 * black-box walkability scores — every input is a named place with a distance,
 * from data we already publish (OSM POIs + CDE schools).
 */

import amenitiesJson from "./generated/amenities.json";
import schoolsJson from "./generated/schools.json";
import type { AmenityCategory, AmenitySummary } from "./amenities";
import type { NearbySchool } from "./schools";

export const WALK_MILE_THRESHOLD = 1.0; // ~15 minutes at 4 mph

export interface AccessEssential {
  key: string;
  label: string;
  nearestName: string | null;
  nearestMiles: number | null;
  within: boolean;
}

export interface AccessScore {
  within: number;
  total: number;
  essentials: AccessEssential[];
  sources: string;
}

const AMENITY_ESSENTIALS: { key: AmenityCategory; label: string }[] = [
  { key: "grocery", label: "Grocery" },
  { key: "park", label: "Park" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "transit", label: "Transit station" },
  { key: "healthcare", label: "Clinic" },
  { key: "library", label: "Library" },
  { key: "food", label: "Café / restaurant" },
];

interface AmenitiesFile {
  areas: Record<string, { summary: AmenitySummary }>;
}
interface SchoolsFile {
  areas: Record<string, { schools: NearbySchool[] }>;
}

const AMENITIES = amenitiesJson as unknown as AmenitiesFile;
const SCHOOLS = schoolsJson as unknown as SchoolsFile;

export function computeAccessScore(areaId: string): AccessScore | null {
  const amen = AMENITIES.areas[areaId]?.summary;
  if (!amen) return null;

  const essentials: AccessEssential[] = AMENITY_ESSENTIALS.map(({ key, label }) => {
    const nearest = amen[key]?.examples[0] ?? null;
    return {
      key,
      label,
      nearestName: nearest?.name ?? null,
      nearestMiles: nearest?.distanceMiles ?? null,
      within: nearest != null && nearest.distanceMiles <= WALK_MILE_THRESHOLD,
    };
  });

  const school = SCHOOLS.areas[areaId]?.schools[0] ?? null;
  essentials.push({
    key: "school",
    label: "Public school",
    nearestName: school?.name ?? null,
    nearestMiles: school?.distanceMiles ?? null,
    within: school != null && school.distanceMiles <= WALK_MILE_THRESHOLD,
  });

  return {
    within: essentials.filter((e) => e.within).length,
    total: essentials.length,
    essentials,
    sources: "© OpenStreetMap contributors · CA Dept. of Education",
  };
}
