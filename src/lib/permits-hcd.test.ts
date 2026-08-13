import { describe, expect, it } from "vitest";
import { HCD_JURISDICTION_MAP, normalizeHcdPermit, parseCsvLine, rowToObject } from "./permits-hcd";

describe("parseCsvLine", () => {
  it("splits a simple unquoted line", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("keeps commas inside quoted fields intact", () => {
    expect(parseCsvLine('a,"MERITAGE RR, V4, L12",c')).toEqual(["a", "MERITAGE RR, V4, L12", "c"]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsvLine('a,"She said ""hi""",c')).toEqual(["a", 'She said "hi"', "c"]);
  });

  it("handles empty fields", () => {
    expect(parseCsvLine("a,,c")).toEqual(["a", "", "c"]);
  });
});

describe("rowToObject", () => {
  it("zips only the columns we care about, by header name not position", () => {
    const header = ["JURIS_NAME", "IGNORE_ME", "UNIT_CAT"];
    const fields = ["EASTVALE", "junk", "SFD"];
    expect(rowToObject(header, fields)).toEqual({ JURIS_NAME: "EASTVALE", UNIT_CAT: "SFD" });
  });
});

describe("normalizeHcdPermit", () => {
  it("normalizes a row with an issued building permit", () => {
    const r = normalizeHcdPermit({
      JURIS_NAME: "EASTVALE",
      STREET_ADDRESS: "6072 Sendero Ave",
      PROJECT_NAME: "Solana PH16",
      JURS_TRACKING_ID: "18-0092",
      UNIT_CAT: "SFD",
      TENURE: "Owner",
      BP_ISSUE_DT1: "2020-07-16",
      LATITUDE: "33.976744",
      LONGITUDE: "-117.587882",
    });
    expect(r).toMatchObject({
      permitNbr: "18-0092",
      address: "6072 Sendero Ave",
      type: "Bldg-New",
      subType: "SFD",
      useDesc: "Owner",
      issueDate: "2020-07-16",
      status: "Issued",
      valuation: null,
      lat: 33.976744,
      lon: -117.587882,
    });
  });

  it("returns null when no building permit was issued (entitled-only row)", () => {
    const r = normalizeHcdPermit({ JURIS_NAME: "FONTANA", UNIT_CAT: "SFD", BP_ISSUE_DT1: "" });
    expect(r).toBeNull();
  });

  it("falls back to a synthetic id when JURS_TRACKING_ID is missing", () => {
    const r = normalizeHcdPermit({
      STREET_ADDRESS: "123 Main St",
      BP_ISSUE_DT1: "2022-01-01",
      UNIT_CAT: "ADU",
    });
    expect(r?.permitNbr).toBe("123 Main St-2022-01-01");
  });
});

describe("HCD_JURISDICTION_MAP", () => {
  it("maps all three non-LA pilot cities", () => {
    expect(HCD_JURISDICTION_MAP).toEqual({
      CLAREMONT: "claremont",
      FONTANA: "fontana-southridge",
      EASTVALE: "eastvale",
    });
  });
});
