/**
 * Persona lens: reorders and re-emphasizes the SAME sourced report sections
 * for different priorities (family, investor). Never filters areas, never
 * changes underlying data or scores — see docs/specs/family-lens.md hard
 * lines. This is presentation ordering only.
 */

export type Lens = "everyone" | "family" | "investor";

export const LENS_LABEL: Record<Lens, string> = {
  everyone: "Everyone",
  family: "Family",
  investor: "Investor",
};

export const LENS_HINT: Record<Lens, string> = {
  everyone: "Default order — every section, unweighted.",
  family: "Schools, daily-life amenities, and risk surfaced first.",
  investor: "Market, development pipeline, and trajectory surfaced first.",
};

/** Full-report (pilot area) section keys, in the "everyone" default order. */
export const PILOT_SECTION_ORDER: Record<Lens, string[]> = {
  everyone: [
    "narrative",
    "changing",
    "housing",
    "pulse",
    "offers",
    "amenities",
    "schools",
    "mobility",
    "development",
    "environment",
    "sources",
  ],
  family: [
    "schools",
    "amenities",
    "environment",
    "housing",
    "mobility",
    "pulse",
    "offers",
    "narrative",
    "changing",
    "development",
    "sources",
  ],
  investor: [
    "housing",
    "development",
    "changing",
    "narrative",
    "environment",
    "mobility",
    "schools",
    "amenities",
    "pulse",
    "offers",
    "sources",
  ],
};

/** Coverage-snapshot (330 non-pilot regions) section keys. */
export const SNAPSHOT_SECTION_ORDER: Record<Lens, string[]> = {
  everyone: ["offers", "highlights", "market", "metrics", "schools", "cta"],
  family: ["schools", "highlights", "offers", "metrics", "market", "cta"],
  investor: ["market", "metrics", "highlights", "offers", "schools", "cta"],
};
