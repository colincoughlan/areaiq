import { describe, expect, it } from "vitest";
import { AREA_ORDER, getArea, listAreas, searchAreas } from "./areas";

describe("pilot area data integrity", () => {
  it("has all four pilot areas in order", () => {
    expect(AREA_ORDER).toHaveLength(4);
    for (const id of AREA_ORDER) expect(getArea(id)).toBeDefined();
  });

  it("every area has exactly three strengths and three tradeoffs", () => {
    for (const a of listAreas()) {
      expect(a.strengths, a.id).toHaveLength(3);
      expect(a.tradeoffs, a.id).toHaveLength(3);
    }
  });

  it("component scores are in range and carry a confidence level", () => {
    for (const a of listAreas()) {
      for (const n of [a.scores.dailyLife, a.scores.housing, a.scores.futureScore]) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }
      expect(["high", "medium", "limited"]).toContain(a.scores.confidence);
    }
  });

  it("every housing metric carries a source name and retrieval date", () => {
    for (const a of listAreas()) {
      for (const m of Object.values(a.housing)) {
        expect(m.sourceName, a.id).toBeTruthy();
        expect(m.retrievedAt, a.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("every area surfaces a risk headline on the summary card (product rule)", () => {
    for (const a of listAreas()) expect(a.riskHeadline.length, a.id).toBeGreaterThan(10);
  });

  it("coordinates are inside the Southern California bounding box", () => {
    for (const a of listAreas()) {
      expect(a.lat).toBeGreaterThan(32.5);
      expect(a.lat).toBeLessThan(35.5);
      expect(a.lng).toBeGreaterThan(-119.5);
      expect(a.lng).toBeLessThan(-116.0);
    }
  });

  it("search matches pilot addresses and names", () => {
    expect(searchAreas("monterey").map((a) => a.id)).toContain("highland-park");
    expect(searchAreas("eastvale").map((a) => a.id)).toContain("eastvale");
    expect(searchAreas("x")).toHaveLength(0); // below min length
  });

  it("never uses prohibited labeling language in narratives (fair-housing rule)", () => {
    const banned = /\b(good|bad|safe|unsafe|desirable|undesirable) (neighborhood|area)\b/i;
    for (const a of listAreas()) {
      expect(a.narrative, a.id).not.toMatch(banned);
      expect(a.changing, a.id).not.toMatch(banned);
    }
  });
});
