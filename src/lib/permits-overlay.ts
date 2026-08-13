/**
 * Overlays real permit data (src/lib/generated/permits.json, produced by
 * `npm run ingest:permits`) onto an area. Areas without real data keep samples.
 */

import permitsJson from "./generated/permits.json";
import type { AreaPermitData, PermitRecord } from "./permits";
import type { Area } from "./types";

interface PermitsFile {
  generatedAt: string | null;
  areas: Record<string, AreaPermitData>;
}

const PERMITS: PermitsFile = permitsJson as unknown as PermitsFile;

export function getPermitData(areaId: string): AreaPermitData | undefined {
  return PERMITS.areas[areaId];
}

/** Replaces the sample permits24mo metric with the real count when available. */
export function withPermits(area: Area): Area {
  const d = PERMITS.areas[area.id];
  if (!d) return area;
  return {
    ...area,
    housing: {
      ...area.housing,
      permits24mo: {
        value: `${d.summary.total.toLocaleString("en-US")} (all types)`,
        source: "official-record",
        sourceName: d.source,
        retrievedAt: d.retrievedAt,
        confidence: d.confidence,
      },
    },
  };
}

export interface PermitHighlights {
  source: string;
  since: string;
  retrievedAt: string;
  total: number;
  newBuildings: number;
  demolitions: number;
  additions: number;
  altersRepairs: number;
  valuationTotal: number;
  valuationCounted: number;
  notable: PermitRecord[];
}

export function permitHighlights(areaId: string): PermitHighlights | null {
  const d = PERMITS.areas[areaId];
  if (!d) return null;
  return {
    source: d.source,
    since: d.since,
    retrievedAt: d.retrievedAt,
    total: d.summary.total,
    newBuildings: d.summary.newBuildings,
    demolitions: d.summary.demolitions,
    additions: d.summary.byType["Bldg-Addition"] ?? 0,
    altersRepairs: d.summary.byType["Bldg-Alter/Repair"] ?? 0,
    valuationTotal: d.summary.valuationTotal,
    valuationCounted: d.summary.valuationCounted,
    notable: d.summary.notable,
  };
}

export function formatUsdCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}
