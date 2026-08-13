import { describe, expect, it } from "vitest";
import { rankRegions, type MatchCandidate } from "./region-match";

function candidate(overrides: Partial<MatchCandidate>): MatchCandidate {
  return {
    id: "x",
    name: "X",
    county: "Los Angeles County",
    tier: "coverage",
    medianRent: 2000,
    amenities: { food: { count: 3, examples: [] }, nightlife: { count: 1, examples: [] } },
    ...overrides,
  };
}

describe("rankRegions", () => {
  it("filters out candidates above the budget", () => {
    const candidates = [
      candidate({ id: "cheap", medianRent: 1800 }),
      candidate({ id: "pricey", medianRent: 3000 }),
    ];
    const results = rankRegions(candidates, { maxRent: 2000, categories: [] });
    expect(results.map((r) => r.id)).toEqual(["cheap"]);
  });

  it("excludes candidates with unknown rent when a budget is set (never guesses)", () => {
    const candidates = [candidate({ id: "unknown", medianRent: null })];
    const results = rankRegions(candidates, { maxRent: 2000, categories: [] });
    expect(results).toHaveLength(0);
  });

  it("includes candidates with unknown rent when no budget constraint is set", () => {
    const candidates = [candidate({ id: "unknown", medianRent: null })];
    const results = rankRegions(candidates, { maxRent: null, categories: [] });
    expect(results.map((r) => r.id)).toEqual(["unknown"]);
  });

  it("requires ALL requested categories to be present (must-have, not nice-to-have)", () => {
    const candidates = [
      candidate({ id: "has-both", amenities: { food: { count: 2, examples: [] }, nightlife: { count: 1, examples: [] } } }),
      candidate({ id: "missing-nightlife", amenities: { food: { count: 2, examples: [] } } }),
    ];
    const results = rankRegions(candidates, { maxRent: null, categories: ["food", "nightlife"] });
    expect(results.map((r) => r.id)).toEqual(["has-both"]);
  });

  it("excludes candidates with no amenity data at all when categories are required", () => {
    const candidates = [candidate({ id: "no-data", amenities: null })];
    const results = rankRegions(candidates, { maxRent: null, categories: ["food"] });
    expect(results).toHaveLength(0);
  });

  it("sorts by rent ascending, then puts unknown-rent candidates last, then alphabetically", () => {
    const candidates = [
      candidate({ id: "b", name: "Banning", medianRent: 1500 }),
      candidate({ id: "a", name: "Anaheim", medianRent: 1500 }),
      candidate({ id: "c", name: "Corona", medianRent: null }),
      candidate({ id: "d", name: "Downey", medianRent: 1200 }),
    ];
    const results = rankRegions(candidates, { maxRent: null, categories: [] });
    expect(results.map((r) => r.id)).toEqual(["d", "a", "b", "c"]);
  });
});
