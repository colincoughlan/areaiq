/**
 * CDE Adjusted Cohort Graduation Rate (ACGR) parsing — pure, unit-tested.
 * Official accountability data, never reduced to a letter grade. Small-cohort
 * values are suppressed by CDE ("*") and stay suppressed here.
 */

export interface SchoolOutcome {
  cdsCode: string;
  cohort: number | null;
  gradRate: number | null; // percent, e.g. 96.3
  ucCsuRate: number | null; // percent meeting UC/CSU requirements
}

export interface AcgrData {
  academicYear: string;
  stateGradRate: number | null;
  stateUcCsuRate: number | null;
  byCds: Record<string, SchoolOutcome>;
}

function num(raw: string | undefined): number | null {
  if (raw == null || raw === "" || raw === "*") return null; // '*' = CDE privacy suppression
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseAcgr(text: string): AcgrData {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0].replace(/^﻿/, "").split("\t");
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`ACGR file missing column: ${name}`);
    return i;
  };
  const iYear = col("AcademicYear");
  const iLevel = col("AggregateLevel");
  const iCounty = col("CountyCode");
  const iDistrict = col("DistrictCode");
  const iSchool = col("SchoolCode");
  const iCategory = col("ReportingCategory");
  const iCharter = col("CharterSchool");
  const iDass = col("DASS");
  const iCohort = col("CohortStudents");
  const iGradRate = col("Regular HS Diploma Graduates (Rate)");
  const iUcCsu = col("Met UC/CSU Grad Req's (Rate)");

  const out: AcgrData = {
    academicYear: "",
    stateGradRate: null,
    stateUcCsuRate: null,
    byCds: {},
  };

  for (const line of lines.slice(1)) {
    const f = line.split("\t");
    if (f.length <= iUcCsu) continue;
    if (f[iCategory] !== "TA") continue; // all-students rows only

    if (f[iLevel] === "T") {
      // State rows are split by charter/DASS status — only the all/all row is
      // the true statewide baseline (the others range 25.7%–92.7%).
      if (f[iCharter].trim() !== "All" || f[iDass].trim() !== "All") continue;
      out.academicYear = f[iYear];
      out.stateGradRate = num(f[iGradRate]);
      out.stateUcCsuRate = num(f[iUcCsu]);
      continue;
    }
    if (f[iLevel] !== "S") continue;

    const cds = `${f[iCounty]}${f[iDistrict]}${f[iSchool]}`;
    if (cds.length !== 14) continue;
    out.byCds[cds] = {
      cdsCode: cds,
      cohort: num(f[iCohort]),
      gradRate: num(f[iGradRate]),
      ucCsuRate: num(f[iUcCsu]),
    };
  }
  return out;
}

/** Compact display: "Grad rate 96% (state 86%) · 74% UC/CSU-eligible" */
export function outcomeSummary(
  o: SchoolOutcome,
  stateGradRate: number | null
): string | null {
  if (o.gradRate == null) return null;
  const parts = [`Grad rate ${Math.round(o.gradRate)}%`];
  if (stateGradRate != null) parts[0] += ` (state ${Math.round(stateGradRate)}%)`;
  if (o.ucCsuRate != null) parts.push(`${Math.round(o.ucCsuRate)}% UC/CSU-eligible`);
  return parts.join(" · ");
}
