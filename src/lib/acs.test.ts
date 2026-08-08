import { describe, expect, it } from "vitest";
import {
  aggregateTracts,
  deriveMetrics,
  deriveRatio,
  moeToConfidence,
  normalizeResponse,
  parseCensusNumber,
} from "./acs";

/**
 * Fixture in the Census API's array-of-arrays shape (header row + data rows).
 * Values are representative, not real.
 */
const PLACE_FIXTURE: string[][] = [
  [
    "NAME",
    "B25003_001E", "B25003_002E", "B25003_003E",
    "B25002_001E", "B25002_003E",
    "B25035_001E", "B19013_001E", "B01003_001E",
    "B25003_001M", "B25003_002M", "B25003_003M",
    "B25002_001M", "B25002_003M",
    "B25035_001M", "B19013_001M", "B01003_001M",
    "state", "place",
  ],
  [
    "Eastvale city, California",
    "18000", "14580", "3420",
    "18520", "520",
    "2007", "145000", "70000",
    "600", "700", "400",
    "620", "180",
    "2", "8000", "1200",
    "06", "21290",
  ],
];

const TRACT_FIXTURE: string[][] = [
  [
    "NAME",
    "B25003_001E", "B25003_002E", "B25003_003E",
    "B25002_001E", "B25002_003E",
    "B25035_001E", "B19013_001E", "B01003_001E",
    "B25003_001M", "B25003_002M", "B25003_003M",
    "B25002_001M", "B25002_003M",
    "B25035_001M", "B19013_001M", "B01003_001M",
    "state", "county", "tract",
  ],
  [
    "Census Tract 1835.10, Los Angeles County, California",
    "1500", "600", "900", "1560", "60", "1948", "82000", "4100",
    "120", "90", "110", "125", "30", "5", "9000", "400",
    "06", "037", "183510",
  ],
  [
    "Census Tract 1836.20, Los Angeles County, California",
    "2000", "900", "1100", "2100", "100", "1952", "-666666666", "5200",
    "160", "120", "140", "165", "40", "4", "-222222222", "500",
    "06", "037", "183620",
  ],
];

describe("parseCensusNumber", () => {
  it("parses numbers and rejects sentinels and blanks", () => {
    expect(parseCensusNumber("42")).toBe(42);
    expect(parseCensusNumber("-666666666")).toBeNull();
    expect(parseCensusNumber("")).toBeNull();
    expect(parseCensusNumber(null)).toBeNull();
  });
});

describe("moeToConfidence", () => {
  it("applies relative-MOE thresholds", () => {
    expect(moeToConfidence(1000, 50)).toBe("high"); // 5%
    expect(moeToConfidence(1000, 200)).toBe("medium"); // 20%
    expect(moeToConfidence(1000, 400)).toBe("limited"); // 40%
    expect(moeToConfidence(1000, null)).toBe("limited");
  });
});

describe("deriveRatio", () => {
  it("computes ratio with ACS MOE propagation", () => {
    const r = deriveRatio(14580, 700, 18000, 600);
    expect(r).not.toBeNull();
    expect(r!.value).toBeCloseTo(0.81, 2);
    expect(r!.moe).not.toBeNull();
    expect(r!.moe!).toBeGreaterThan(0);
    expect(r!.confidence).toBe("high");
  });
  it("returns null for a missing or zero denominator", () => {
    expect(deriveRatio(10, 1, null, 1)).toBeNull();
    expect(deriveRatio(10, 1, 0, 1)).toBeNull();
  });
});

describe("place fixture end-to-end", () => {
  it("normalizes and derives owner/renter/vacancy with sources of confidence", () => {
    const geos = normalizeResponse(PLACE_FIXTURE);
    expect(geos).toHaveLength(1);
    expect(geos[0].name).toContain("Eastvale");

    const m = deriveMetrics(geos[0], { period: "ACS 2020-2024 5-year", retrievedAt: "2026-08-06" });
    expect(m.ownerPct!.value).toBeCloseTo(0.81, 2);
    expect(m.renterPct!.value).toBeCloseTo(0.19, 2);
    expect(m.vacancyPct!.value).toBeCloseTo(0.028, 2);
    expect(m.medianYearBuilt!.value).toBe(2007);
    expect(m.medianIncome!.value).toBe(145000);
    expect(m.population!.confidence).toBe("high");
  });
});

describe("tract aggregation", () => {
  it("sums estimates, root-sum-squares MOEs, and omits medians", () => {
    const geos = normalizeResponse(TRACT_FIXTURE);
    const agg = aggregateTracts(geos);

    expect(agg.estimates.B25003_001E).toBe(3500);
    expect(agg.estimates.B01003_001E).toBe(9300);
    expect(agg.moes.B25003_001E).toBeCloseTo(Math.sqrt(120 * 120 + 160 * 160), 5);
    // medians must not be aggregated
    expect(agg.estimates.B25035_001E).toBeUndefined();
    expect(agg.estimates.B19013_001E).toBeUndefined();

    const m = deriveMetrics(agg, { period: "ACS 2020-2024 5-year", retrievedAt: "2026-08-06" });
    expect(m.ownerPct!.value).toBeCloseTo(1500 / 3500, 4);
    expect(m.medianYearBuilt).toBeUndefined();
    expect(m.medianIncome).toBeUndefined();
  });

  it("handles sentinel values inside tract rows", () => {
    const geos = normalizeResponse(TRACT_FIXTURE);
    // second tract's income was a sentinel -> parsed as null
    expect(geos[1].estimates.B19013_001E).toBeNull();
  });
});

describe("response guards", () => {
  it("throws on empty or malformed responses", () => {
    expect(() => normalizeResponse([])).toThrow();
    expect(() => normalizeResponse([["FOO"], ["1"]])).toThrow(/NAME/);
  });
});
