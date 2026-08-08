import { describe, expect, it } from "vitest";
import { computeAccessScore, WALK_MILE_THRESHOLD } from "./access";
import { AREA_ORDER } from "./areas";

describe("15-minute access score", () => {
  it("computes for every pilot area with amenity data", () => {
    for (const id of AREA_ORDER) {
      const s = computeAccessScore(id);
      expect(s, id).not.toBeNull();
      expect(s!.total).toBe(8); // 7 amenity essentials + public school
      expect(s!.within).toBeGreaterThanOrEqual(0);
      expect(s!.within).toBeLessThanOrEqual(s!.total);
    }
  });

  it("dense urban pilot beats car-dependent pilot (sanity on real data)", () => {
    const hp = computeAccessScore("highland-park")!;
    const fon = computeAccessScore("fontana-southridge")!;
    expect(hp.within).toBeGreaterThan(fon.within);
  });

  it("within flag matches the threshold on every essential", () => {
    const s = computeAccessScore("highland-park")!;
    for (const e of s.essentials) {
      if (e.nearestMiles == null) expect(e.within).toBe(false);
      else expect(e.within).toBe(e.nearestMiles <= WALK_MILE_THRESHOLD);
    }
  });

  it("returns null for areas without amenity data", () => {
    expect(computeAccessScore("torrance")).toBeNull();
  });

  it("carries required attributions", () => {
    const s = computeAccessScore("highland-park")!;
    expect(s.sources).toMatch(/OpenStreetMap/);
    expect(s.sources).toMatch(/Education/);
  });
});
