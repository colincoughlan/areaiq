import { describe, expect, it } from "vitest";
import { buildAreaContext } from "./context";
import { extractCitations, validateAnswer } from "./validate";
import { AREA_ORDER } from "../areas";

describe("buildAreaContext", () => {
  it("builds a numbered fact sheet with unique sequential source ids for every area", () => {
    for (const areaId of AREA_ORDER) {
      const ctx = buildAreaContext(areaId)!;
      expect(ctx).not.toBeNull();
      expect(ctx.factSheet.length).toBeGreaterThan(500);
      const ids = ctx.sources.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id, i) => expect(id).toBe(`S${i + 1}`));
      // every fact line ends with at least one known source tag
      for (const line of ctx.factSheet.split("\n")) {
        const cited = extractCitations(line);
        expect(cited.length, `uncited fact in ${areaId}: ${line}`).toBeGreaterThan(0);
        for (const c of cited) expect(ids).toContain(c);
      }
    }
  });

  it("includes live data sources for areas that have them", () => {
    const hp = buildAreaContext("highland-park")!;
    const names = hp.sources.map((s) => s.name).join(" | ");
    expect(names).toMatch(/Census/i);
    expect(names).toMatch(/Building & Safety/i);
    expect(names).toMatch(/Dept\. of Education/i);
  });

  it("returns null for unknown areas", () => {
    expect(buildAreaContext("nowhere")).toBeNull();
  });

  it("contains no person names from permit records (privacy)", () => {
    const hp = buildAreaContext("highland-park")!;
    // fact sheet should reference addresses and types, never applicant fields
    expect(hp.factSheet).not.toMatch(/applicant|contractor/i);
  });
});

describe("validateAnswer", () => {
  const allowed = ["S1", "S2", "S3"];

  it("accepts a compliant cited answer", () => {
    const r = validateAnswer(
      "Permit activity is well above the citywide rate [S1]. The renter share is 65% with high confidence [S2].",
      allowed
    );
    expect(r.ok).toBe(true);
    expect(r.citedIds.sort()).toEqual(["S1", "S2"]);
  });

  it("rejects answers without citations", () => {
    const r = validateAnswer("Lots of construction is happening.", allowed);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("no citations");
  });

  it("rejects invented source ids", () => {
    const r = validateAnswer("The area is growing [S9].", allowed);
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/invented/);
  });

  it("rejects banned labeling language", () => {
    expect(validateAnswer("This is a good neighborhood [S1].", allowed).ok).toBe(false);
    expect(validateAnswer("The area is unsafe at night [S1].", allowed).ok).toBe(false);
    expect(
      validateAnswer("It is an unsafe area according to residents [S1].", allowed).ok
    ).toBe(false);
  });

  it("rejects forecast language", () => {
    expect(
      validateAnswer("Home values will appreciate significantly here [S1].", allowed).ok
    ).toBe(false);
    expect(
      validateAnswer("Buyers are guaranteed appreciation in this market [S1].", allowed).ok
    ).toBe(false);
  });

  it("rejects steering language", () => {
    expect(
      validateAnswer("You'll find the right kind of people here [S1].", allowed).ok
    ).toBe(false);
  });

  it("allows strengths/tradeoffs framing", () => {
    const r = validateAnswer(
      "Strengths include rail access [S1]; tradeoffs include an older housing stock [S2]. Vacancy data has limited confidence [S3].",
      allowed
    );
    expect(r.ok).toBe(true);
  });
});
