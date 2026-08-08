import { describe, expect, it } from "vitest";
import {
  haversineMiles,
  isNeighborhoodSchool,
  nearbySchools,
  parseCdeTsv,
  type CdeSchool,
} from "./schools";

describe("haversineMiles", () => {
  it("computes known distances", () => {
    // Highland Park center to Franklin High (~0.45 mi)
    const d = haversineMiles(34.111, -118.192, 34.115417, -118.19906);
    expect(d).toBeGreaterThan(0.3);
    expect(d).toBeLessThan(0.6);
    // Same point = 0
    expect(haversineMiles(34, -118, 34, -118)).toBe(0);
    // LA to SF ≈ 347 mi
    const la2sf = haversineMiles(34.0522, -118.2437, 37.7749, -122.4194);
    expect(la2sf).toBeGreaterThan(340);
    expect(la2sf).toBeLessThan(355);
  });
});

const HEADER =
  "CDSCode\tStatusType\tCounty\tDistrict\tSchool\tCharter\tSOCType\tGSoffered\tVirtual\tMagnet\tLatitude\tLongitude";
function row(parts: Record<string, string>): string {
  const defaults: Record<string, string> = {
    CDSCode: "1",
    StatusType: "Active",
    County: "Los Angeles",
    District: "Test USD",
    School: "Test Elementary",
    Charter: "N",
    SOCType: "Elementary Schools (Public)",
    GSoffered: "K-5",
    Virtual: "N",
    Magnet: "N",
    Latitude: "34.111",
    Longitude: "-118.192",
  };
  return HEADER.split("\t")
    .map((h) => ({ ...defaults, ...parts })[h])
    .join("\t");
}

describe("parseCdeTsv", () => {
  it("resolves columns by header name regardless of order", () => {
    const text = [HEADER, row({ School: "Alpha", Latitude: "34.1", Longitude: "-118.2" })].join("\n");
    const schools = parseCdeTsv(text);
    expect(schools).toHaveLength(1);
    expect(schools[0].name).toBe("Alpha");
    expect(schools[0].lat).toBeCloseTo(34.1);
  });
  it("skips rows without coordinates and errors on missing columns", () => {
    const text = [HEADER, row({ Latitude: "No Data", Longitude: "No Data" })].join("\n");
    expect(parseCdeTsv(text)).toHaveLength(0);
    expect(() => parseCdeTsv("Foo\tBar\n1\t2")).toThrow(/missing column/);
  });
});

describe("filtering and proximity", () => {
  const mk = (over: Partial<CdeSchool>): CdeSchool => ({
    cdsCode: "19647331933043",
    name: "S",
    district: "D",
    status: "Active",
    socType: "Elementary Schools (Public)",
    grades: "K-5",
    charter: false,
    magnet: false,
    virtual: "N",
    lat: 34.111,
    lng: -118.192,
    ...over,
  });

  it("excludes closed, virtual, and non-instructional rows", () => {
    expect(isNeighborhoodSchool(mk({}))).toBe(true);
    expect(isNeighborhoodSchool(mk({ status: "Closed" }))).toBe(false);
    expect(isNeighborhoodSchool(mk({ virtual: "F" }))).toBe(false);
    expect(isNeighborhoodSchool(mk({ socType: "District Community Day Schools" }))).toBe(false);
    expect(isNeighborhoodSchool(mk({ socType: "High Schools (Public)" }))).toBe(true);
  });

  it("sorts by distance, respects radius and limit", () => {
    const center = { lat: 34.111, lng: -118.192 };
    const list = [
      mk({ name: "Near", lat: 34.113, lng: -118.193 }),
      mk({ name: "Mid", lat: 34.125, lng: -118.2 }),
      mk({ name: "Far", lat: 34.3, lng: -118.4 }), // ~17 mi — outside radius
    ];
    const res = nearbySchools(list, center, 2.0, 8);
    expect(res.map((s) => s.name)).toEqual(["Near", "Mid"]);
    expect(res[0].distanceMiles).toBeLessThanOrEqual(res[1].distanceMiles);
  });
});
