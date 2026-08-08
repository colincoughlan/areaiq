import { describe, expect, it } from "vitest";
import {
  buildOverpassQuery,
  categorize,
  summarizeAmenities,
  type OverpassElement,
} from "./amenities";

describe("categorize", () => {
  it("maps OSM tags to categories", () => {
    expect(categorize({ shop: "supermarket" })).toBe("grocery");
    expect(categorize({ amenity: "pharmacy" })).toBe("pharmacy");
    expect(categorize({ amenity: "cafe" })).toBe("food");
    expect(categorize({ amenity: "fast_food" })).toBe("food");
    expect(categorize({ leisure: "park" })).toBe("park");
    expect(categorize({ amenity: "library" })).toBe("library");
    expect(categorize({ amenity: "hospital" })).toBe("healthcare");
    expect(categorize({ leisure: "fitness_centre" })).toBe("fitness");
    expect(categorize({ amenity: "kindergarten" })).toBe("childcare");
    expect(categorize({ railway: "station" })).toBe("transit");
  });
  it("returns null for unmatched tags", () => {
    expect(categorize({ shop: "car_repair" })).toBeNull();
    expect(categorize({ amenity: "bench" })).toBeNull();
    expect(categorize({})).toBeNull();
  });
});

const CENTER = { lat: 34.111, lng: -118.192 };
const el = (
  id: number,
  tags: Record<string, string>,
  opts: Partial<OverpassElement> = {}
): OverpassElement => ({
  type: "node",
  id,
  lat: 34.112,
  lon: -118.193,
  tags,
  ...opts,
});

describe("summarizeAmenities", () => {
  it("counts by category and orders named examples by distance", () => {
    const s = summarizeAmenities(
      [
        el(1, { shop: "supermarket", name: "Far Market" }, { lat: 34.13, lon: -118.21 }),
        el(2, { shop: "supermarket", name: "Near Market" }),
        el(3, { shop: "supermarket" }), // unnamed: counted, not an example
        el(4, { amenity: "cafe", name: "Café A" }),
      ],
      CENTER
    );
    expect(s.grocery!.count).toBe(3);
    expect(s.grocery!.examples.map((e) => e.name)).toEqual(["Near Market", "Far Market"]);
    expect(s.food!.count).toBe(1);
  });

  it("handles ways with center coordinates and dedupes ids", () => {
    const park: OverpassElement = {
      type: "way",
      id: 9,
      center: { lat: 34.113, lon: -118.19 },
      tags: { leisure: "park", name: "Central Park" },
    };
    const s = summarizeAmenities([park, park], CENTER);
    expect(s.park!.count).toBe(1);
    expect(s.park!.examples[0].name).toBe("Central Park");
  });

  it("skips elements without coordinates or matching tags", () => {
    const s = summarizeAmenities(
      [
        { type: "relation", id: 1, tags: { leisure: "park" } }, // no coords
        el(2, { amenity: "bench" }),
      ],
      CENTER
    );
    expect(s.park).toBeUndefined();
  });
});

describe("buildOverpassQuery", () => {
  it("includes all category filters and the around clause", () => {
    const q = buildOverpassQuery(34.1, -118.2, 3218);
    expect(q).toContain("around:3218,34.1,-118.2");
    for (const frag of ["supermarket", "pharmacy", "park", "fitness_centre", "station"]) {
      expect(q).toContain(frag);
    }
    expect(q).toContain("out center");
  });
});
