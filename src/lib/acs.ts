/**
 * Pure logic for Census ACS ingestion: geography config, variable definitions,
 * normalization, MOE math, and confidence labeling. No I/O here — the CLI in
 * scripts/ingest-acs.ts does fetching; these functions are unit-tested.
 */

import type { Confidence } from "./types";

// ---------- geography config ----------

export interface PlaceGeo {
  kind: "place";
  state: string;
  place: string;
  /** Returned NAME must contain this — guards against wrong FIPS codes. */
  expectName: string;
  /** Label when the census geography is broader than the AreaIQ area. */
  scopeNote?: string;
}

export interface TractGroupGeo {
  kind: "tract-group";
  state: string;
  county: string;
  tracts: string[];
  provisional?: boolean;
}

export type Geo = PlaceGeo | TractGroupGeo;

export const GEOGRAPHIES: Record<string, Geo> = {
  eastvale: { kind: "place", state: "06", place: "21230", expectName: "Eastvale" },
  claremont: { kind: "place", state: "06", place: "13756", expectName: "Claremont" },
  "fontana-southridge": {
    kind: "place",
    state: "06",
    place: "24680",
    expectName: "Fontana",
    scopeNote: "Fontana citywide",
  },
  "highland-park": {
    kind: "tract-group",
    state: "06",
    county: "037",
    // PROVISIONAL — verify against TIGERweb / LA Times neighborhood boundaries
    // before trusting output. The ingest script warns while this flag is set.
    tracts: ["183510", "183520", "183610", "183620", "183701", "183702", "183810", "183820"],
    provisional: true,
  },
};

// ---------- variables ----------

/** Estimate variable -> its margin-of-error variable is the same id with M suffix. */
export const ACS_VARIABLES = [
  "B25003_001E", // occupied units (tenure universe)
  "B25003_002E", // owner-occupied
  "B25003_003E", // renter-occupied
  "B25002_001E", // total housing units
  "B25002_003E", // vacant units
  "B25035_001E", // median year built (places only)
  "B19013_001E", // median household income (places only)
  "B01003_001E", // total population
  "B23025_003E", // civilian labor force
  "B23025_005E", // unemployed
  "B25064_001E", // median gross rent (places only)
] as const;

export type AcsVariable = (typeof ACS_VARIABLES)[number];

export function moeVariable(v: AcsVariable): string {
  return v.replace(/E$/, "M");
}

/** Census sentinel values meaning "no estimate". */
const SENTINELS = new Set([-666666666, -888888888, -999999999, -222222222, -333333333]);

export function parseCensusNumber(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || SENTINELS.has(n)) return null;
  return n;
}

// ---------- response normalization ----------

export interface GeoValues {
  name: string;
  estimates: Partial<Record<AcsVariable, number | null>>;
  moes: Partial<Record<AcsVariable, number | null>>;
}

/**
 * Census API returns an array-of-arrays: header row then data rows.
 * Normalizes one row per geography.
 */
export function normalizeResponse(rows: string[][]): GeoValues[] {
  if (rows.length < 2) throw new Error("ACS response has no data rows");
  const header = rows[0];
  const nameIdx = header.indexOf("NAME");
  if (nameIdx === -1) throw new Error("ACS response missing NAME column");

  return rows.slice(1).map((row) => {
    const g: GeoValues = { name: row[nameIdx], estimates: {}, moes: {} };
    for (const v of ACS_VARIABLES) {
      const ei = header.indexOf(v);
      const mi = header.indexOf(moeVariable(v));
      if (ei !== -1) g.estimates[v] = parseCensusNumber(row[ei]);
      if (mi !== -1) g.moes[v] = parseCensusNumber(row[mi]);
    }
    return g;
  });
}

/** Sum estimates across tracts; aggregate MOEs as sqrt of sum of squares. */
export function aggregateTracts(geos: GeoValues[]): GeoValues {
  const out: GeoValues = { name: `${geos.length} census tracts`, estimates: {}, moes: {} };
  for (const v of ACS_VARIABLES) {
    // Medians cannot be summed — omit them for tract groups.
    if (v === "B25035_001E" || v === "B19013_001E" || v === "B25064_001E") continue;
    let sum = 0;
    let moeSq = 0;
    let any = false;
    for (const g of geos) {
      const e = g.estimates[v];
      if (e == null) continue;
      any = true;
      sum += e;
      const m = g.moes[v];
      if (m != null) moeSq += m * m;
    }
    out.estimates[v] = any ? sum : null;
    out.moes[v] = any ? Math.sqrt(moeSq) : null;
  }
  return out;
}

// ---------- derived metrics ----------

export interface DerivedValue {
  value: number;
  moe: number | null;
  confidence: Confidence;
}

/** Relative MOE (90% CI) → confidence label. */
export function moeToConfidence(estimate: number, moe: number | null): Confidence {
  if (moe == null) return "limited";
  if (estimate === 0) return "limited";
  const rel = moe / Math.abs(estimate);
  if (rel < 0.1) return "high";
  if (rel < 0.25) return "medium";
  return "limited";
}

/**
 * Ratio p = num/den with the standard ACS ratio-MOE approximation:
 * MOE_p = (1/den) * sqrt(MOE_num² + p² * MOE_den²)
 */
export function deriveRatio(
  num: number | null | undefined,
  numMoe: number | null | undefined,
  den: number | null | undefined,
  denMoe: number | null | undefined
): DerivedValue | null {
  if (num == null || den == null || den === 0) return null;
  const p = num / den;
  let moe: number | null = null;
  if (numMoe != null && denMoe != null) {
    const inner = numMoe * numMoe - p * p * (denMoe * denMoe);
    // Census guidance: if the term under the root is negative, use the sum form.
    const radicand = inner > 0 ? inner : numMoe * numMoe + p * p * (denMoe * denMoe);
    moe = Math.sqrt(radicand) / den;
  }
  return { value: p, moe, confidence: moeToConfidence(p, moe) };
}

export interface AreaAcsMetrics {
  geographyName: string;
  scopeNote?: string;
  provisional?: boolean;
  period: string; // e.g. "ACS 2020-2024 5-year"
  retrievedAt: string; // ISO date
  ownerPct?: DerivedValue;
  renterPct?: DerivedValue;
  vacancyPct?: DerivedValue;
  medianYearBuilt?: DerivedValue;
  medianIncome?: DerivedValue;
  population?: DerivedValue;
  unemploymentRate?: DerivedValue;
  medianRent?: DerivedValue;
}

export function deriveMetrics(
  g: GeoValues,
  opts: { period: string; retrievedAt: string; scopeNote?: string; provisional?: boolean }
): AreaAcsMetrics {
  const e = g.estimates;
  const m = g.moes;
  const single = (v: AcsVariable): DerivedValue | undefined => {
    const est = e[v];
    if (est == null) return undefined;
    const moe = m[v] ?? null;
    return { value: est, moe, confidence: moeToConfidence(est, moe) };
  };

  return {
    geographyName: g.name,
    scopeNote: opts.scopeNote,
    provisional: opts.provisional,
    period: opts.period,
    retrievedAt: opts.retrievedAt,
    ownerPct:
      deriveRatio(e.B25003_002E, m.B25003_002E, e.B25003_001E, m.B25003_001E) ?? undefined,
    renterPct:
      deriveRatio(e.B25003_003E, m.B25003_003E, e.B25003_001E, m.B25003_001E) ?? undefined,
    vacancyPct:
      deriveRatio(e.B25002_003E, m.B25002_003E, e.B25002_001E, m.B25002_001E) ?? undefined,
    medianYearBuilt: single("B25035_001E"),
    medianIncome: single("B19013_001E"),
    population: single("B01003_001E"),
    unemploymentRate:
      deriveRatio(e.B23025_005E, m.B23025_005E, e.B23025_003E, m.B23025_003E) ?? undefined,
    medianRent: single("B25064_001E"),
  };
}

// ---------- formatting for the UI ----------

export function formatPct(d: DerivedValue): string {
  return `${Math.round(d.value * 100)}%`;
}

export function formatMoney(d: DerivedValue): string {
  return `$${Math.round(d.value).toLocaleString("en-US")}`;
}
