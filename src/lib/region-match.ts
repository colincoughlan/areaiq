/**
 * Pure logic for "find areas under $X with the amenities I need" matching.
 * No I/O here — src/lib/region-match-data.ts assembles real candidates from
 * the generated ACS + amenities data; this file just ranks/filters, so it's
 * fully unit-testable with synthetic fixtures. See docs/specs/
 * budget-amenity-match.md.
 */

import type { AmenityCategory, AmenitySummary } from "./amenities";

export interface MatchCandidate {
  id: string;
  name: string;
  county: string;
  tier: "pilot" | "coverage";
  /** Median gross rent (ACS), or null if not available for this place. */
  medianRent: number | null;
  /** null means amenity data hasn't been ingested for this place yet. */
  amenities: AmenitySummary | null;
}

export interface MatchCriteria {
  maxRent?: number | null;
  /** Must-have categories — reorder philosophy doesn't apply here, this is
   * a hard filter, but it never touches area *scores* or eligibility beyond
   * "does this data point exist," so it stays outside fair-housing rules. */
  categories: AmenityCategory[];
}

export interface MatchResult extends MatchCandidate {
  matchedCategories: AmenityCategory[];
}

/** True if maxRent is set but we don't know this candidate's rent — in that
 * case we exclude rather than guess, since claiming a fit we can't verify
 * would violate the no-fabrication rule. */
function failsBudget(c: MatchCandidate, maxRent: number | null | undefined): boolean {
  if (maxRent == null) return false;
  if (c.medianRent == null) return true;
  return c.medianRent > maxRent;
}

export function rankRegions(candidates: MatchCandidate[], criteria: MatchCriteria): MatchResult[] {
  const out: MatchResult[] = [];

  for (const c of candidates) {
    if (failsBudget(c, criteria.maxRent)) continue;

    const matched: AmenityCategory[] = [];
    let allPresent = true;
    for (const cat of criteria.categories) {
      const count = c.amenities?.[cat]?.count ?? 0;
      if (count > 0) {
        matched.push(cat);
      } else {
        allPresent = false;
        break;
      }
    }
    if (!allPresent) continue;

    out.push({ ...c, matchedCategories: matched });
  }

  return out.sort((a, z) => {
    if (a.medianRent != null && z.medianRent != null && a.medianRent !== z.medianRent) {
      return a.medianRent - z.medianRent;
    }
    if (a.medianRent == null && z.medianRent != null) return 1;
    if (a.medianRent != null && z.medianRent == null) return -1;
    return a.name.localeCompare(z.name);
  });
}
