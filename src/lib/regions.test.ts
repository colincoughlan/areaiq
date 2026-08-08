import { describe, expect, it } from "vitest";
import { parseGazetteer, pointInRing, slugify } from "./regions-build";
import {
  buildRegionSnapshot,
  listRegions,
  REGIONAL_MEDIANS,
  searchRegions,
} from "./regions";

describe("regions-build pure logic", () => {
  it("parses gazetteer rows and strips place-type suffixes", () => {
    const text = [
      "USPS\tGEOID\tANSICODE\tNAME\tLSAD\tFUNCSTAT\tALAND\tAWATER\tALAND_SQMI\tAWATER_SQMI\tINTPTLAT\tINTPTLONG",
      "CA\t0621230\t123\tEastvale city\t25\tA\t1\t0\t1\t0\t33.96\t-117.56",
      "CA\t0699999\t124\tSomewhere CDP\t57\tS\t1\t0\t1\t0\t34.0\t-118.0",
    ].join("\n");
    const p = parseGazetteer(text);
    expect(p).toHaveLength(2);
    expect(p[0]).toMatchObject({ name: "Eastvale", kind: "city", placeFips: "21230" });
    expect(p[1]).toMatchObject({ name: "Somewhere", kind: "cdp" });
  });

  it("point-in-ring works for a simple square", () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(pointInRing(5, 5, square)).toBe(true);
    expect(pointInRing(15, 5, square)).toBe(false);
  });

  it("slugify produces url-safe unique-ish ids", () => {
    expect(slugify("La Cañada Flintridge")).toBe("la-canada-flintridge");
    expect(slugify("Rancho Santa Margarita")).toBe("rancho-santa-margarita");
  });
});

describe("region registry + snapshots", () => {
  it("covers all five counties with a plausible number of places", () => {
    const regions = listRegions();
    expect(regions.length).toBeGreaterThan(300);
    const counties = new Set(regions.map((r) => r.county));
    expect(counties.size).toBe(5);
  });

  it("finds major cities via search", () => {
    expect(searchRegions("torrance")[0]?.name).toBe("Torrance");
    expect(searchRegions("irvine")[0]?.name).toBe("Irvine");
    expect(searchRegions("temecula")[0]?.name).toBe("Temecula");
  });

  it("regional medians are computed and sane", () => {
    expect(REGIONAL_MEDIANS.ownerPct).toBeGreaterThan(0.3);
    expect(REGIONAL_MEDIANS.ownerPct).toBeLessThan(0.95);
    expect(REGIONAL_MEDIANS.medianIncome).toBeGreaterThan(40000);
    expect(REGIONAL_MEDIANS.medianYearBuilt).toBeGreaterThan(1950);
  });

  it("builds a sourced snapshot for a known city", () => {
    const snap = buildRegionSnapshot("torrance")!;
    expect(snap).not.toBeNull();
    expect(snap.tier).toBe("coverage");
    expect(snap.metrics.length).toBeGreaterThan(3);
    for (const m of snap.metrics) {
      expect(m.sourceName).toMatch(/Census/);
      expect(["high", "medium", "limited"]).toContain(m.confidence);
    }
    expect(snap.disclaimer).toMatch(/snapshot/i);
  });

  it("snapshot highlights are deterministic comparisons/trends, never labels", () => {
    // Highlights come from three sources: median comparisons (ownerPct/income/year
    // built), trajectory statements (income/population change over time), and county
    // unemployment stats. All must avoid verdict language; only the first group is
    // phrased as an explicit median comparison.
    for (const id of ["torrance", "irvine", "adelanto", "temecula"]) {
      const snap = buildRegionSnapshot(id);
      if (!snap) continue;
      for (const h of snap.highlights) {
        expect(h).not.toMatch(/\b(good|bad|safe|unsafe|desirable)\b/i);
        const isComparisonOrTrend = /median|regional median|rose|fell|grew|declined|unemployment/i.test(h);
        expect(isComparisonOrTrend).toBe(true);
      }
    }
  });

  it("returns null for unknown ids", () => {
    expect(buildRegionSnapshot("atlantis")).toBeNull();
  });
});
