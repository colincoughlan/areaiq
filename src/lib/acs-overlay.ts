/**
 * Overlays generated ACS data (src/lib/generated/acs.json, produced by
 * `npm run ingest:acs`) onto an area's sample housing metrics. Anything the
 * ACS file doesn't cover keeps its sample value and label.
 */

import acsJson from "./generated/acs.json";
import { formatMoney, formatPct, type AreaAcsMetrics, type DerivedValue } from "./acs";
import type { Area, Sourced } from "./types";

interface AcsFile {
  generatedAt: string | null;
  vintage: number | null;
  areas: Record<string, AreaAcsMetrics>;
}

const ACS: AcsFile = acsJson as unknown as AcsFile;

function sourced(
  d: DerivedValue,
  formatted: string,
  metrics: AreaAcsMetrics
): Sourced<string> {
  const scope = metrics.scopeNote ? ` — ${metrics.scopeNote}` : "";
  return {
    value: formatted,
    source: "government-dataset",
    sourceName: `U.S. Census ${metrics.period}${scope}`,
    retrievedAt: metrics.retrievedAt,
    confidence: metrics.provisional ? "limited" : d.confidence,
  };
}

/** Returns the area with real ACS values overlaid where available. */
export function withAcs(area: Area): Area {
  const m = ACS.areas[area.id];
  if (!m) return area;

  const housing = { ...area.housing };
  if (m.ownerPct) housing.ownerOccupied = sourced(m.ownerPct, formatPct(m.ownerPct), m);
  if (m.renterPct) housing.renterOccupied = sourced(m.renterPct, formatPct(m.renterPct), m);
  if (m.vacancyPct) housing.vacancy = sourced(m.vacancyPct, formatPct(m.vacancyPct), m);
  if (m.medianYearBuilt) {
    housing.housingAge = sourced(
      m.medianYearBuilt,
      `Median year built ${Math.round(m.medianYearBuilt.value)}`,
      m
    );
  }

  return { ...area, housing };
}

/** Optional extras for display (income, population) when ACS data exists. */
export function acsExtras(
  areaId: string
): { label: string; metric: Sourced<string> }[] {
  const m = ACS.areas[areaId];
  if (!m) return [];
  const out: { label: string; metric: Sourced<string> }[] = [];
  if (m.medianIncome) {
    out.push({
      label: "Median household income",
      metric: sourced(m.medianIncome, formatMoney(m.medianIncome), m),
    });
  }
  if (m.population) {
    out.push({
      label: "Population",
      metric: sourced(m.population, Math.round(m.population.value).toLocaleString("en-US"), m),
    });
  }
  if (m.unemploymentRate) {
    out.push({
      label: "Unemployment (civilian labor force)",
      metric: sourced(
        m.unemploymentRate,
        `${(m.unemploymentRate.value * 100).toFixed(1)}%`,
        m
      ),
    });
  }
  if (m.medianRent) {
    out.push({
      label: "Median gross rent",
      metric: sourced(m.medianRent, formatMoney(m.medianRent) + "/mo", m),
    });
  }
  if (m.childrenUnder18) {
    const pct = m.childrenPct ? ` (${formatPct(m.childrenPct)} of population)` : "";
    out.push({
      label: "Children under 18",
      metric: sourced(
        m.childrenUnder18,
        `${Math.round(m.childrenUnder18.value).toLocaleString("en-US")}${pct}`,
        m
      ),
    });
  }
  return out;
}

/** Children by Census age bracket, for family-buyer questions ("how many kids
 * ages 6-11 live here?"). Empty array if the ACS overlay has no data. */
export function acsChildBrackets(
  areaId: string
): { label: string; metric: Sourced<string> }[] {
  const m = ACS.areas[areaId];
  if (!m || !m.childBrackets) return [];
  return m.childBrackets.map((b) => ({
    label: b.label,
    metric: sourced(b.value, Math.round(b.value.value).toLocaleString("en-US"), m),
  }));
}
