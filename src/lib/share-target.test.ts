import { describe, expect, it } from "vitest";
import { matchAreaFromShare } from "./share-target";

const CANDIDATES = [
  "eastvale",
  "torrance",
  "los-angeles",
  "highland-park",
  "fontana",
  "fontana-southridge",
  "claremont",
];

describe("matchAreaFromShare", () => {
  it("matches a Zillow listing URL by embedded city slug", () => {
    const id = matchAreaFromShare(
      { url: "https://www.zillow.com/homedetails/13380-Citrus-St-Eastvale-CA-92880/12345678_zpid/" },
      CANDIDATES
    );
    expect(id).toBe("eastvale");
  });

  it("matches a Redfin listing URL by embedded city path segment", () => {
    const id = matchAreaFromShare(
      { url: "https://www.redfin.com/CA/Torrance/1234-Main-St-90503/home/12345" },
      CANDIDATES
    );
    expect(id).toBe("torrance");
  });

  it("falls back to the city (not neighborhood) when only the city appears", () => {
    const id = matchAreaFromShare(
      { url: "https://www.zillow.com/homedetails/123-York-Blvd-Los-Angeles-CA-90042/98765_zpid/" },
      CANDIDATES
    );
    expect(id).toBe("los-angeles");
  });

  it("prefers the longer, more specific match when both appear", () => {
    const id = matchAreaFromShare(
      { text: "Check out this house in Fontana Southridge, great deal!" },
      CANDIDATES
    );
    expect(id).toBe("fontana-southridge");
  });

  it("returns null when nothing matches — honest fallback, no false positive", () => {
    const id = matchAreaFromShare(
      { url: "https://www.zillow.com/homedetails/1-Made-Up-St-Nowhereville-CA-00000/1_zpid/" },
      CANDIDATES
    );
    expect(id).toBeNull();
  });

  it("does not false-positive match a short id inside an unrelated word", () => {
    const id = matchAreaFromShare({ text: "We loved the villa on our trip" }, ["la", ...CANDIDATES]);
    expect(id).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(matchAreaFromShare({}, CANDIDATES)).toBeNull();
  });
});
