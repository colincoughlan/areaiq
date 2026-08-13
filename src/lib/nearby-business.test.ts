import { describe, expect, it } from "vitest";
import {
  buildBusinessQuery,
  findCategory,
  parseBusinessResults,
  type OverpassElement,
} from "./nearby-business";

describe("findCategory", () => {
  it("matches known keywords, case-insensitively and via substring", () => {
    expect(findCategory("dance schools")?.key).toBe("dance");
    expect(findCategory("Ballet")?.key).toBe("dance");
    expect(findCategory("karate")?.key).toBe("martial-arts");
    expect(findCategory("yoga studio")?.key).toBe("gym");
  });

  it("returns null for unrecognized free text", () => {
    expect(findCategory("underwater basket weaving")).toBeNull();
    expect(findCategory("")).toBeNull();
  });
});

describe("buildBusinessQuery", () => {
  it("builds a single-line query combining tag filters and a name fallback for a known category", () => {
    const { query, category } = buildBusinessQuery("dance", 34.1, -118.2, 4828);
    expect(category?.key).toBe("dance");
    expect(query).not.toMatch(/\n/);
    expect(query).toContain(`around:4828,34.1,-118.2`);
    expect(query).toContain(`"amenity"="dancing_school"`);
    expect(query).toContain(`"name"~"dance",i`);
  });

  it("falls back to a name-only query for unrecognized terms", () => {
    const { query, category } = buildBusinessQuery("pottery studio", 34.1, -118.2, 4828);
    expect(category).toBeNull();
    expect(query).toContain(`"name"~"pottery studio",i`);
    expect(query).not.toContain("amenity");
  });

  it("strips quote and backslash characters from the search term", () => {
    const { query } = buildBusinessQuery('weird"name\\', 34.1, -118.2, 4828);
    expect(query).toContain(`"name"~"weirdname",i`);
  });
});

describe("parseBusinessResults", () => {
  const center = { lat: 34.0, lng: -118.0 };
  const dance = { key: "dance", label: "Dance", keywords: ["dance"], filters: [`["amenity"="dancing_school"]`] };

  it("dedupes, requires a name, computes distance, and labels tag vs name matches", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 1, lat: 34.01, lon: -118.0, tags: { name: "Sheng Ballet", amenity: "dancing_school" } },
      { type: "node", id: 1, lat: 34.01, lon: -118.0, tags: { name: "Sheng Ballet", amenity: "dancing_school" } }, // dup
      { type: "node", id: 2, lat: 34.02, lon: -118.0, tags: { name: "Dance-y Clothing Co", shop: "clothes" } },
      { type: "way", id: 3, center: { lat: 34.0, lon: -118.05 }, tags: { amenity: "dancing_school" } }, // no name
    ];
    const results = parseBusinessResults(elements, center, dance);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("Sheng Ballet");
    expect(results[0].matchType).toBe("tagged");
    expect(results[0].distanceMiles).toBeGreaterThan(0);
    expect(results[1].name).toBe("Dance-y Clothing Co");
    expect(results[1].matchType).toBe("name");
  });

  it("extracts address, phone, website when present", () => {
    const elements: OverpassElement[] = [
      {
        type: "node",
        id: 1,
        lat: 34.01,
        lon: -118.0,
        tags: {
          name: "Pointe Ballet",
          amenity: "dancing_school",
          "addr:housenumber": "123",
          "addr:street": "Main St",
          phone: "555-1234",
          website: "https://example.com",
        },
      },
    ];
    const [r] = parseBusinessResults(elements, center, dance);
    expect(r.address).toBe("123 Main St");
    expect(r.phone).toBe("555-1234");
    expect(r.website).toBe("https://example.com");
  });

  it("sorts by distance and respects the limit", () => {
    const elements: OverpassElement[] = Array.from({ length: 5 }, (_, i) => ({
      type: "node",
      id: i,
      lat: 34.0 + (5 - i) * 0.01,
      lon: -118.0,
      tags: { name: `Studio ${i}`, amenity: "dancing_school" },
    }));
    const results = parseBusinessResults(elements, center, dance, 3);
    expect(results).toHaveLength(3);
    expect(results[0].distanceMiles).toBeLessThanOrEqual(results[1].distanceMiles);
    expect(results[1].distanceMiles).toBeLessThanOrEqual(results[2].distanceMiles);
  });
});
