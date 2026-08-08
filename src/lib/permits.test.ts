import { describe, expect, it } from "vitest";
import {
  freshnessConfidence,
  normalizePermit,
  parseValuation,
  summarizePermits,
  tractToCt,
  type RawPermitRow,
} from "./permits";

describe("tractToCt", () => {
  it("reformats ACS tract ids to the LA dataset ct format", () => {
    expect(tractToCt("183510")).toBe("1835.10");
    expect(tractToCt("183701")).toBe("1837.01");
    expect(tractToCt("141700")).toBe("1417.00");
    expect(tractToCt("012345")).toBe("123.45"); // leading zeros drop from the integer part
  });
  it("rejects malformed ids", () => {
    expect(() => tractToCt("18351")).toThrow();
    expect(() => tractToCt("1835.10")).toThrow();
  });
});

describe("parseValuation", () => {
  it("parses numbers, rejects blanks and negatives", () => {
    expect(parseValuation("125000")).toBe(125000);
    expect(parseValuation("0")).toBe(0);
    expect(parseValuation("")).toBeNull();
    expect(parseValuation(undefined)).toBeNull();
    expect(parseValuation("-5")).toBeNull();
    expect(parseValuation("abc")).toBeNull();
  });
});

const ROWS: RawPermitRow[] = [
  {
    permit_nbr: "A1",
    primary_address: "100 YORK BLVD",
    ct: "1835.10",
    permit_type: "Bldg-New",
    permit_sub_type: "Apartment",
    use_desc: "New 12-unit apartment",
    work_desc: "NEW 12 UNIT APARTMENT BUILDING",
    issue_date: "2026-06-15T00:00:00.000",
    status_desc: "Issued",
    valuation: "2500000",
    lat: "34.11",
    lon: "-118.19",
  },
  {
    permit_nbr: "A2",
    primary_address: "200 AVE 57",
    ct: "1836.10",
    permit_type: "Bldg-Alter/Repair",
    issue_date: "2026-05-01T00:00:00.000",
    valuation: "40000",
  },
  {
    permit_nbr: "A3",
    primary_address: "300 MONTEREY RD",
    ct: "1837.01",
    permit_type: "Bldg-Demolition",
    issue_date: "2025-12-01T00:00:00.000",
    valuation: "", // unparseable — counted in total, excluded from valuation sum
  },
  {
    permit_nbr: "", // missing id — dropped
    issue_date: "2026-01-01T00:00:00.000",
  },
];

describe("normalize + summarize", () => {
  it("drops invalid rows and summarizes counts, types, valuation, newest date", () => {
    const records = ROWS.map(normalizePermit).filter((p) => p !== null);
    expect(records).toHaveLength(3);

    const s = summarizePermits(records);
    expect(s.total).toBe(3);
    expect(s.newBuildings).toBe(1);
    expect(s.demolitions).toBe(1);
    expect(s.byType["Bldg-Alter/Repair"]).toBe(1);
    expect(s.valuationTotal).toBe(2_540_000);
    expect(s.valuationCounted).toBe(2);
    expect(s.newestIssueDate).toBe("2026-06-15");
    // notable sorted by valuation, excludes null-valuation records
    expect(s.notable.map((p) => p.permitNbr)).toEqual(["A1", "A2"]);
  });

  it("never carries applicant or contractor fields (privacy rule)", () => {
    const raw = {
      ...ROWS[0],
      applicant_first_name: "Jane",
      contractors_business_name: "ACME BUILDERS",
    } as RawPermitRow;
    const p = normalizePermit(raw)!;
    expect(JSON.stringify(p)).not.toContain("Jane");
    expect(JSON.stringify(p)).not.toContain("ACME");
  });
});

describe("freshnessConfidence", () => {
  it("downgrades stale feeds", () => {
    expect(freshnessConfidence("2026-07-01", "2026-08-07")).toBe("high");
    expect(freshnessConfidence("2026-03-15", "2026-08-07")).toBe("medium");
    expect(freshnessConfidence("2025-08-01", "2026-08-07")).toBe("limited");
    expect(freshnessConfidence(null, "2026-08-07")).toBe("limited");
  });
});
