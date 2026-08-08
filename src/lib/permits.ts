/**
 * Pure logic for building-permit ingestion (LA City Socrata dataset pi9x-tg5x).
 * No I/O — fetching lives in scripts/ingest-permits.ts. Unit-tested.
 */

import type { Confidence } from "./types";

/** ACS tract id ("183510") → LA dataset `ct` format ("1835.10"). */
export function tractToCt(tract: string): string {
  if (!/^\d{6}$/.test(tract)) throw new Error(`Unexpected tract id: ${tract}`);
  return `${Number(tract.slice(0, 4))}.${tract.slice(4)}`;
}

/** Raw Socrata row (subset we consume). */
export interface RawPermitRow {
  permit_nbr?: string;
  primary_address?: string;
  ct?: string;
  permit_type?: string;
  permit_sub_type?: string;
  use_desc?: string;
  work_desc?: string;
  issue_date?: string;
  status_desc?: string;
  valuation?: string;
  lat?: string;
  lon?: string;
}

export interface PermitRecord {
  permitNbr: string;
  address: string;
  ct: string;
  type: string;
  subType: string;
  useDesc: string;
  workDesc: string;
  issueDate: string; // YYYY-MM-DD
  status: string;
  valuation: number | null;
  lat: number | null;
  lon: number | null;
}

export function parseValuation(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Normalize a raw row. Privacy rule: applicant/contractor/owner names are never
 * carried through, even if present on the raw row.
 */
export function normalizePermit(r: RawPermitRow): PermitRecord | null {
  if (!r.permit_nbr || !r.issue_date) return null;
  const num = (v: string | undefined) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    permitNbr: r.permit_nbr,
    address: r.primary_address ?? "",
    ct: r.ct ?? "",
    type: r.permit_type ?? "",
    subType: r.permit_sub_type ?? "",
    useDesc: r.use_desc ?? "",
    workDesc: (r.work_desc ?? "").slice(0, 200),
    issueDate: r.issue_date.slice(0, 10),
    status: r.status_desc ?? "",
    valuation: parseValuation(r.valuation),
    lat: num(r.lat),
    lon: num(r.lon),
  };
}

export interface PermitSummary {
  total: number;
  byType: Record<string, number>;
  newBuildings: number;
  demolitions: number;
  valuationTotal: number;
  valuationCounted: number; // how many records had a parseable valuation
  newestIssueDate: string | null;
  notable: PermitRecord[];
}

export function summarizePermits(records: PermitRecord[], notableCount = 5): PermitSummary {
  const byType: Record<string, number> = {};
  let valuationTotal = 0;
  let valuationCounted = 0;
  let newest: string | null = null;

  for (const p of records) {
    byType[p.type] = (byType[p.type] ?? 0) + 1;
    if (p.valuation != null) {
      valuationTotal += p.valuation;
      valuationCounted += 1;
    }
    if (newest === null || p.issueDate > newest) newest = p.issueDate;
  }

  const notable = [...records]
    .filter((p) => p.valuation != null)
    .sort((a, b) => (b.valuation ?? 0) - (a.valuation ?? 0))
    .slice(0, notableCount);

  return {
    total: records.length,
    byType,
    newBuildings: byType["Bldg-New"] ?? 0,
    demolitions: byType["Bldg-Demolition"] ?? 0,
    valuationTotal,
    valuationCounted,
    newestIssueDate: newest,
    notable,
  };
}

/** Freshness → confidence. Stale feeds must not present as fully trusted. */
export function freshnessConfidence(
  newestIssueDate: string | null,
  asOf: string
): Confidence {
  if (!newestIssueDate) return "limited";
  const newest = new Date(newestIssueDate).getTime();
  const now = new Date(asOf).getTime();
  const days = (now - newest) / 86_400_000;
  if (days <= 90) return "high";
  if (days <= 180) return "medium";
  return "limited";
}

export interface AreaPermitData {
  source: string;
  datasetId: string;
  periodMonths: number;
  since: string;
  retrievedAt: string;
  confidence: Confidence;
  summary: PermitSummary;
}
