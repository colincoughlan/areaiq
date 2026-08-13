/**
 * SoCal-wide coverage layer: every city/CDP in the five counties gets a
 * data-driven snapshot report. No editorial content is fabricated — every
 * statement is a sourced metric or a deterministic comparison to the
 * five-county median, labeled as such.
 */

import regionsJson from "./generated/regions.json";
import acsRegionsJson from "./generated/acs-regions.json";
import schoolsRegionsJson from "./generated/schools-regions.json";
import { formatMoney, formatPct, type AreaAcsMetrics, type DerivedValue } from "./acs";
import { countyUnemploymentText, trajectoryHighlights } from "./trends-overlay";
import type { NearbySchool } from "./schools";
import type { RegionEntry } from "./regions-build";
import type { Confidence } from "./types";

const REGIONS = (regionsJson as unknown as { regions: RegionEntry[] }).regions;
const ACS = (acsRegionsJson as unknown as { vintage: number; areas: Record<string, AreaAcsMetrics> });
const SCHOOLS = schoolsRegionsJson as unknown as {
  source: string;
  radiusMiles: number;
  generatedAt: string;
  areas: Record<string, NearbySchool[]>;
};

export function listRegions(): RegionEntry[] {
  return REGIONS;
}

export function getRegion(id: string): RegionEntry | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function searchRegions(query: string, limit = 8): RegionEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts = REGIONS.filter((r) => r.name.toLowerCase().startsWith(q));
  const contains = REGIONS.filter(
    (r) => !r.name.toLowerCase().startsWith(q) && `${r.name} ${r.county}`.toLowerCase().includes(q)
  );
  return [...starts, ...contains].slice(0, limit);
}

// ---- regional medians (deterministic, computed once) ----

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function collect(pick: (m: AreaAcsMetrics) => DerivedValue | undefined): number[] {
  return Object.values(ACS.areas)
    .map((m) => pick(m)?.value)
    .filter((v): v is number => v != null);
}

export const REGIONAL_MEDIANS = {
  ownerPct: median(collect((m) => m.ownerPct)),
  medianIncome: median(collect((m) => m.medianIncome)),
  medianYearBuilt: median(collect((m) => m.medianYearBuilt)),
  childrenPct: median(collect((m) => m.childrenPct)),
};

// ---- snapshot ----

export interface SnapshotMetric {
  label: string;
  value: string;
  confidence: Confidence;
  sourceName: string;
  retrievedAt: string;
}

export interface RegionSnapshot {
  region: RegionEntry;
  tier: "coverage";
  period: string;
  metrics: SnapshotMetric[];
  /** Deterministic comparisons to the five-county median — sourced, not editorial. */
  highlights: string[];
  schools: NearbySchool[];
  schoolsSource: { source: string; retrievedAt: string; radiusMiles: number } | null;
  childBrackets: { label: string; value: string; confidence: Confidence }[];
  disclaimer: string;
}

export const COVERAGE_DISCLAIMER =
  "Data snapshot: official statistics only, without AreaIQ editorial analysis, development records, or component scores. Those are currently available for pilot areas. Comparisons reference the median across all 334 covered SoCal places.";

function fmtPctPoint(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export function buildRegionSnapshot(id: string): RegionSnapshot | null {
  const region = getRegion(id);
  if (!region) return null;
  const m = ACS.areas[id];
  const metrics: SnapshotMetric[] = [];
  const highlights: string[] = [];
  const period = m?.period ?? `ACS 5-year`;

  const push = (label: string, d: DerivedValue | undefined, fmt: (d: DerivedValue) => string) => {
    if (!d) return;
    metrics.push({
      label,
      value: fmt(d),
      confidence: d.confidence,
      sourceName: `U.S. Census ${period}`,
      retrievedAt: m.retrievedAt,
    });
  };

  if (m) {
    push("Owner-occupied", m.ownerPct, formatPct);
    push("Renter-occupied", m.renterPct, formatPct);
    push("Vacancy", m.vacancyPct, formatPct);
    push("Median year built", m.medianYearBuilt, (d) => String(Math.round(d.value)));
    push("Median household income", m.medianIncome, formatMoney);
    push("Population", m.population, (d) => Math.round(d.value).toLocaleString("en-US"));
    push("Unemployment", m.unemploymentRate, (d) => `${(d.value * 100).toFixed(1)}%`);
    push("Median gross rent", m.medianRent, (d) => `${formatMoney(d)}/mo`);
    push("Children under 18", m.childrenUnder18, (d) => Math.round(d.value).toLocaleString("en-US"));

    if (m.childrenPct && REGIONAL_MEDIANS.childrenPct != null) {
      const diff = m.childrenPct.value - REGIONAL_MEDIANS.childrenPct;
      if (Math.abs(diff) >= 0.03) {
        highlights.push(
          `Children under 18 are ${fmtPctPoint(m.childrenPct.value)} of the population, ${diff > 0 ? "above" : "below"} the five-county median of ${fmtPctPoint(REGIONAL_MEDIANS.childrenPct)}.`
        );
      }
    }

    if (m.ownerPct && REGIONAL_MEDIANS.ownerPct != null) {
      const diff = m.ownerPct.value - REGIONAL_MEDIANS.ownerPct;
      if (Math.abs(diff) >= 0.05) {
        highlights.push(
          `Owner-occupancy (${fmtPctPoint(m.ownerPct.value)}) is ${diff > 0 ? "above" : "below"} the five-county median of ${fmtPctPoint(REGIONAL_MEDIANS.ownerPct)}.`
        );
      }
    }
    if (m.medianYearBuilt && REGIONAL_MEDIANS.medianYearBuilt != null) {
      const diff = m.medianYearBuilt.value - REGIONAL_MEDIANS.medianYearBuilt;
      if (Math.abs(diff) >= 10) {
        highlights.push(
          `Housing stock is ${diff > 0 ? "newer" : "older"} than typical for the region (median year built ${Math.round(m.medianYearBuilt.value)} vs regional median ${Math.round(REGIONAL_MEDIANS.medianYearBuilt)}).`
        );
      }
    }
    if (m.medianIncome && REGIONAL_MEDIANS.medianIncome != null) {
      const ratio = m.medianIncome.value / REGIONAL_MEDIANS.medianIncome;
      if (ratio >= 1.2 || ratio <= 0.8) {
        highlights.push(
          `Median household income (${formatMoney(m.medianIncome)}) is ${ratio > 1 ? "above" : "below"} the regional median of ${formatMoney({ value: REGIONAL_MEDIANS.medianIncome, moe: null, confidence: "medium" })}.`
        );
      }
    }
  }

  // Trajectory: deterministic change-over-time statements (the "up-and-coming" evidence).
  highlights.push(...trajectoryHighlights(id));
  const countyJobs = countyUnemploymentText(region.county);
  if (countyJobs) highlights.push(`${countyJobs.text}. (${countyJobs.source})`);

  const childBrackets = (m?.childBrackets ?? []).map((b) => ({
    label: b.label,
    value: Math.round(b.value.value).toLocaleString("en-US"),
    confidence: b.value.confidence,
  }));

  return {
    region,
    tier: "coverage",
    period,
    metrics,
    highlights,
    schools: SCHOOLS.areas[id] ?? [],
    schoolsSource: SCHOOLS.areas[id]
      ? { source: SCHOOLS.source, retrievedAt: SCHOOLS.generatedAt, radiusMiles: SCHOOLS.radiusMiles }
      : null,
    childBrackets,
    disclaimer: COVERAGE_DISCLAIMER,
  };
}
