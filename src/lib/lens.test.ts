import { describe, expect, it } from "vitest";
import { PILOT_SECTION_ORDER, SNAPSHOT_SECTION_ORDER, type Lens } from "./lens";

const LENSES: Lens[] = ["everyone", "family", "investor"];

describe("lens ordering — reorders only, never filters", () => {
  it("every lens shows the exact same set of pilot sections", () => {
    const base = new Set(PILOT_SECTION_ORDER.everyone);
    for (const lens of LENSES) {
      const keys = PILOT_SECTION_ORDER[lens];
      expect(new Set(keys)).toEqual(base);
      expect(keys).toHaveLength(base.size); // no duplicates either
    }
  });

  it("every lens shows the exact same set of snapshot sections", () => {
    const base = new Set(SNAPSHOT_SECTION_ORDER.everyone);
    for (const lens of LENSES) {
      const keys = SNAPSHOT_SECTION_ORDER[lens];
      expect(new Set(keys)).toEqual(base);
      expect(keys).toHaveLength(base.size);
    }
  });

  it("family and investor orders actually differ from everyone (otherwise the toggle is a no-op)", () => {
    expect(PILOT_SECTION_ORDER.family).not.toEqual(PILOT_SECTION_ORDER.everyone);
    expect(PILOT_SECTION_ORDER.investor).not.toEqual(PILOT_SECTION_ORDER.everyone);
    expect(SNAPSHOT_SECTION_ORDER.family).not.toEqual(SNAPSHOT_SECTION_ORDER.everyone);
    expect(SNAPSHOT_SECTION_ORDER.investor).not.toEqual(SNAPSHOT_SECTION_ORDER.everyone);
  });
});
