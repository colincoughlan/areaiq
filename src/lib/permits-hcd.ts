/**
 * Pure logic for the CA HCD Annual Progress Report "Table A2" permit
 * ingestion (docs/specs/permits-ingestion.md). Covers pilot cities that
 * don't have their own open-data API (Eastvale, Fontana, Claremont) — LA
 * City's live Socrata feed (Highland Park) is untouched, this only adds
 * areas. No I/O here — fetching lives in scripts/ingest-permits-hcd.ts.
 */

import type { PermitRecord } from "./permits";

/** JURIS_NAME (as reported in the CSV) → AreaIQ pilot area id. */
export const HCD_JURISDICTION_MAP: Record<string, string> = {
  CLAREMONT: "claremont",
  FONTANA: "fontana-southridge",
  EASTVALE: "eastvale",
};

/**
 * Splits one CSV line respecting double-quoted fields (which may contain
 * commas and doubled "" escaped quotes) — HCD's PROJECT_NAME field routinely
 * contains commas, so a naive split(",") silently corrupts columns.
 */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

export interface HcdRow {
  JURIS_NAME?: string;
  CNTY_NAME?: string;
  YEAR?: string;
  STREET_ADDRESS?: string;
  PROJECT_NAME?: string;
  JURS_TRACKING_ID?: string;
  UNIT_CAT?: string;
  TENURE?: string;
  BP_ISSUE_DT1?: string;
  LATITUDE?: string;
  LONGITUDE?: string;
}

/** Zip a header row + data row into a keyed object for the columns we use. */
export function rowToObject(header: string[], fields: string[]): HcdRow {
  const want = new Set([
    "JURIS_NAME",
    "CNTY_NAME",
    "YEAR",
    "STREET_ADDRESS",
    "PROJECT_NAME",
    "JURS_TRACKING_ID",
    "UNIT_CAT",
    "TENURE",
    "BP_ISSUE_DT1",
    "LATITUDE",
    "LONGITUDE",
  ]);
  const out: HcdRow = {};
  for (let i = 0; i < header.length; i++) {
    if (want.has(header[i])) (out as Record<string, string>)[header[i]] = fields[i] ?? "";
  }
  return out;
}

/**
 * Normalizes an HCD row into the same PermitRecord shape LA's Socrata feed
 * produces, so it plugs into the existing summarizePermits()/PermitActivity
 * UI unchanged. Every row in this table represents a new housing unit
 * (Table A2 doesn't track demolitions, additions, or non-residential work at
 * all) — `type` is uniformly "Bldg-New" so summarizePermits' newBuildings
 * count is accurate; the real unit category (SFD/ADU/5+/etc.) is kept in
 * `subType`. No dollar valuation is reported by this source — `valuation`
 * is always null, which the UI already handles (hides the "largest
 * permits" list and, with the valuationCounted fix, the valuation stat).
 * Returns null for rows without an issued building permit date (entitled-
 * only or completed-only rows aren't "permits issued").
 */
export function normalizeHcdPermit(r: HcdRow): PermitRecord | null {
  if (!r.BP_ISSUE_DT1) return null;
  const num = (v: string | undefined) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const id = r.JURS_TRACKING_ID?.trim() || `${r.STREET_ADDRESS}-${r.BP_ISSUE_DT1}`;
  return {
    permitNbr: id,
    address: (r.STREET_ADDRESS ?? "").trim(),
    ct: "",
    type: "Bldg-New",
    subType: r.UNIT_CAT ?? "",
    useDesc: r.TENURE ?? "",
    workDesc: r.PROJECT_NAME?.trim() ?? "",
    issueDate: r.BP_ISSUE_DT1.slice(0, 10),
    status: "Issued",
    valuation: null,
    lat: num(r.LATITUDE),
    lon: num(r.LONGITUDE),
  };
}
