import { describe, expect, it } from "vitest";
import { outcomeSummary, parseAcgr } from "./school-outcomes";

const HEADER = [
  "AcademicYear", "AggregateLevel", "CountyCode", "DistrictCode", "SchoolCode",
  "CountyName", "DistrictName", "SchoolName", "CharterSchool", "DASS",
  "ReportingCategory", "CohortStudents",
  "Regular HS Diploma Graduates (Count)", "Regular HS Diploma Graduates (Rate)",
  "Met UC/CSU Grad Req's (Count)", "Met UC/CSU Grad Req's (Rate)",
].join("\t");

function row(parts: Record<string, string>): string {
  const defaults: Record<string, string> = {
    AcademicYear: "2023-24", AggregateLevel: "S", CountyCode: "19",
    DistrictCode: "64733", SchoolCode: "1933043", CountyName: "LA",
    DistrictName: "LAUSD", SchoolName: "Test High", CharterSchool: "No ",
    DASS: "No ", ReportingCategory: "TA", CohortStudents: "320",
    "Regular HS Diploma Graduates (Count)": "308",
    "Regular HS Diploma Graduates (Rate)": "96.3",
    "Met UC/CSU Grad Req's (Count)": "237",
    "Met UC/CSU Grad Req's (Rate)": "74",
  };
  return HEADER.split("\t").map((h) => ({ ...defaults, ...parts })[h]).join("\t");
}

describe("parseAcgr", () => {
  it("takes only the All/All state row (the file has 9 state splits)", () => {
    const text = [
      HEADER,
      row({ AggregateLevel: "T", CharterSchool: "Yes", DASS: "Yes", "Regular HS Diploma Graduates (Rate)": "25.7" }),
      row({ AggregateLevel: "T", CharterSchool: "All", DASS: "All", "Regular HS Diploma Graduates (Rate)": "86.4" }),
      row({ AggregateLevel: "T", CharterSchool: "No ", DASS: "No ", "Regular HS Diploma Graduates (Rate)": "92.7" }),
      row({}),
    ].join("\n");
    const d = parseAcgr(text);
    expect(d.stateGradRate).toBe(86.4);
    expect(d.byCds["19647331933043"].gradRate).toBe(96.3);
  });

  it("skips non-TA reporting categories and non-school aggregate rows", () => {
    const text = [
      HEADER,
      row({ ReportingCategory: "GM" }), // gender split — not the all-students row
      row({ AggregateLevel: "D" }), // district aggregate
    ].join("\n");
    expect(Object.keys(parseAcgr(text).byCds)).toHaveLength(0);
  });

  it("preserves CDE privacy suppression (small cohorts stay null)", () => {
    const text = [
      HEADER,
      row({ CohortStudents: "*", "Regular HS Diploma Graduates (Rate)": "*", "Met UC/CSU Grad Req's (Rate)": "*" }),
    ].join("\n");
    const o = parseAcgr(text).byCds["19647331933043"];
    expect(o.gradRate).toBeNull();
    expect(o.cohort).toBeNull();
  });
});

describe("outcomeSummary", () => {
  it("formats with state context", () => {
    expect(
      outcomeSummary({ cdsCode: "x", cohort: 320, gradRate: 96.3, ucCsuRate: 74 }, 86.4)
    ).toBe("Grad rate 96% (state 86%) · 74% UC/CSU-eligible");
  });
  it("returns null when the rate is suppressed", () => {
    expect(outcomeSummary({ cdsCode: "x", cohort: null, gradRate: null, ucCsuRate: null }, 86.4)).toBeNull();
  });
});
