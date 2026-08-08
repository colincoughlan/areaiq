import { describe, expect, it } from "vitest";
import { getAreaPayload, listAreaSummaries } from "./api-payload";
import { AREA_ORDER } from "./areas";

describe("API payload serialization", () => {
  it("lists all pilot areas with coordinates and direction", () => {
    const list = listAreaSummaries();
    expect(list.map((a) => a.id)).toEqual([...AREA_ORDER]);
    for (const a of list) {
      expect(a.lat).toBeTypeOf("number");
      expect(a.name.length).toBeGreaterThan(2);
    }
  });

  it("returns a complete payload with overlays applied", () => {
    const p = getAreaPayload("highland-park")!;
    expect(p).not.toBeNull();
    // live ACS overlay applied (real value, not the 42% sample)
    expect(p.area.housing.ownerOccupied.value).toBe("35%");
    expect(p.area.housing.ownerOccupied.source).toBe("government-dataset");
    // live permits applied
    expect(p.permits).not.toBeNull();
    expect(p.permits!.total).toBeGreaterThan(100);
    // live schools applied
    expect(p.schoolsSource).not.toBeNull();
    expect(p.area.schools.length).toBeGreaterThan(4);
    // serializes cleanly (what the route returns)
    const json = JSON.parse(JSON.stringify(p));
    expect(json.disclaimer).toMatch(/protected characteristics/);
  });

  it("returns null for unknown areas", () => {
    expect(getAreaPayload("nowhere")).toBeNull();
  });

  it("payload carries source metadata on every housing metric", () => {
    for (const id of AREA_ORDER) {
      const p = getAreaPayload(id)!;
      for (const m of Object.values(p.area.housing)) {
        expect(m.sourceName.length, id).toBeGreaterThan(3);
        expect(m.retrievedAt, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(["high", "medium", "limited"]).toContain(m.confidence);
      }
    }
  });
});
