/**
 * API-first serialization: the exact area payload any client (web, PWA,
 * future native app) consumes. Pure and unit-tested — the API routes are
 * thin wrappers around these functions.
 */

import { AREA_ORDER, getArea } from "./areas";
import { withAcs, acsExtras } from "./acs-overlay";
import { withPermits, permitHighlights, type PermitHighlights } from "./permits-overlay";
import { withSchools, schoolsMeta } from "./schools-overlay";
import { withAmenities, amenitiesMeta } from "./amenities-overlay";
import type { Area } from "./types";

export const API_VERSION = "v1";

export interface AreaListItem {
  id: string;
  name: string;
  county: string;
  lat: number;
  lng: number;
  direction: Area["direction"];
}

export interface AreaPayload {
  apiVersion: string;
  area: Area; // with all live-data overlays applied
  extras: { label: string; metric: Area["housing"]["ownerOccupied"] }[];
  permits: PermitHighlights | null;
  schoolsSource: { source: string; retrievedAt: string; radiusMiles: number } | null;
  amenitiesSource: { source: string; retrievedAt: string; radiusMiles: number } | null;
  disclaimer: string;
}

export const DISCLAIMER =
  "Figures mix official sources (labeled with source and retrieval date) and illustrative Phase 1 sample data. Component scores only — AreaIQ does not rank neighborhoods, and never uses protected characteristics.";

export function listAreaSummaries(): AreaListItem[] {
  return AREA_ORDER.map((id) => {
    const a = getArea(id)!;
    return {
      id: a.id,
      name: a.name,
      county: a.county,
      lat: a.lat,
      lng: a.lng,
      direction: a.direction,
    };
  });
}

export function getAreaPayload(areaId: string): AreaPayload | null {
  const base = getArea(areaId);
  if (!base) return null;
  return {
    apiVersion: API_VERSION,
    area: withAmenities(withSchools(withPermits(withAcs(base)))),
    extras: acsExtras(areaId),
    permits: permitHighlights(areaId),
    schoolsSource: schoolsMeta(areaId),
    amenitiesSource: amenitiesMeta(areaId),
    disclaimer: DISCLAIMER,
  };
}
