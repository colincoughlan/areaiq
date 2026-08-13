/**
 * Assembles real MatchCandidate[] for the budget+amenities finder from the
 * generated ACS and amenities data (pilots + all 334 coverage regions).
 * All I/O-adjacent (static JSON reads) — kept separate from region-match.ts
 * so the ranking logic itself stays pure and unit-testable.
 */

import { AREAS } from "./areas";
import { listRegions } from "./regions";
import acsJson from "./generated/acs.json";
import acsRegionsJson from "./generated/acs-regions.json";
import amenitiesJson from "./generated/amenities.json";
import amenitiesRegionsJson from "./generated/amenities-regions.json";
import type { AreaAcsMetrics } from "./acs";
import type { AmenitySummary } from "./amenities";
import type { MatchCandidate } from "./region-match";

const ACS_PILOTS = (acsJson as unknown as { areas: Record<string, AreaAcsMetrics> }).areas;
const ACS_REGIONS = (acsRegionsJson as unknown as { areas: Record<string, AreaAcsMetrics> }).areas;
const AMENITIES_PILOTS = (amenitiesJson as unknown as { areas: Record<string, { summary: AmenitySummary }> }).areas;
const AMENITIES_REGIONS = (amenitiesRegionsJson as unknown as { areas: Record<string, { summary: AmenitySummary }> }).areas;

export interface MatchDataCoverage {
  totalCandidates: number;
  withRentData: number;
  withAmenityData: number;
}

export function getMatchCandidates(): { candidates: MatchCandidate[]; coverage: MatchDataCoverage } {
  const candidates: MatchCandidate[] = [];

  for (const area of Object.values(AREAS)) {
    candidates.push({
      id: area.id,
      name: area.name,
      county: area.county,
      tier: "pilot",
      medianRent: ACS_PILOTS[area.id]?.medianRent?.value ?? null,
      amenities: AMENITIES_PILOTS[area.id]?.summary ?? null,
    });
  }

  const pilotIds = new Set(Object.keys(AREAS));
  for (const region of listRegions()) {
    if (pilotIds.has(region.id)) continue; // pilots already added above, with richer data
    candidates.push({
      id: region.id,
      name: region.name,
      county: region.county,
      tier: "coverage",
      medianRent: ACS_REGIONS[region.id]?.medianRent?.value ?? null,
      amenities: AMENITIES_REGIONS[region.id]?.summary ?? null,
    });
  }

  const coverage: MatchDataCoverage = {
    totalCandidates: candidates.length,
    withRentData: candidates.filter((c) => c.medianRent != null).length,
    withAmenityData: candidates.filter((c) => c.amenities != null).length,
  };

  return { candidates, coverage };
}
