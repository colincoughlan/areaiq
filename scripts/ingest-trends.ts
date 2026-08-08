/**
 * Trajectory ingestion — the evidence behind "up-and-coming". Usage:
 *   CENSUS_API_KEY=... npm run ingest:trends
 *
 * 1. ACS change over time: 2013-2017 vs 2020-2024 (non-overlapping 5-year
 *    windows) median income + population per place.
 * 2. BLS LAUS: monthly county unemployment, latest vs a year earlier.
 *
 * Writes src/lib/generated/trends.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RegionEntry } from "../src/lib/regions-build";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src/lib/generated/trends.json");
const REGIONS_PATH = join(ROOT, "src/lib/generated/regions.json");
const ACS_REGIONS_PATH = join(ROOT, "src/lib/generated/acs-regions.json");
const BASE_VINTAGE = 2017; // ACS 2013-2017, non-overlapping with 2020-2024

const KEY = process.env.CENSUS_API_KEY;
if (!KEY) {
  console.error("CENSUS_API_KEY is required.");
  process.exit(1);
}

const COUNTY_SERIES: Record<string, string> = {
  "06037": "LAUCN060370000000003",
  "06059": "LAUCN060590000000003",
  "06065": "LAUCN060650000000003",
  "06071": "LAUCN060710000000003",
  "06111": "LAUCN061110000000003",
};

interface CountyTrend {
  latestRate: number;
  latestPeriod: string; // "June 2026"
  yearAgoRate: number | null;
}

interface AreaTrend {
  incomeChangePct: number | null; // fraction, e.g. 0.41
  popChangePct: number | null;
}

async function fetchBls(): Promise<Record<string, CountyTrend>> {
  const year = new Date().getFullYear();
  const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      seriesid: Object.values(COUNTY_SERIES),
      startyear: String(year - 2),
      endyear: String(year),
    }),
  });
  if (!res.ok) throw new Error(`BLS ${res.status}`);
  const data = (await res.json()) as {
    status: string;
    Results: { series: { seriesID: string; data: { year: string; period: string; periodName: string; value: string }[] }[] };
  };
  if (data.status !== "REQUEST_SUCCEEDED") throw new Error(`BLS status: ${data.status}`);

  const out: Record<string, CountyTrend> = {};
  for (const [fips, sid] of Object.entries(COUNTY_SERIES)) {
    const series = data.Results.series.find((s) => s.seriesID === sid);
    if (!series || series.data.length === 0) continue;
    const latest = series.data[0];
    const yearAgo = series.data.find(
      (d) => d.period === latest.period && Number(d.year) === Number(latest.year) - 1
    );
    out[fips] = {
      latestRate: Number(latest.value),
      latestPeriod: `${latest.periodName} ${latest.year}`,
      yearAgoRate: yearAgo ? Number(yearAgo.value) : null,
    };
  }
  return out;
}

async function fetchAcsBase(): Promise<Map<string, { income: number | null; pop: number | null }>> {
  const url = `https://api.census.gov/data/${BASE_VINTAGE}/acs/acs5?get=B19013_001E,B01003_001E&for=place:*&in=state:06&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census ${BASE_VINTAGE} API ${res.status}`);
  const rows = (await res.json()) as string[][];
  const header = rows[0];
  const iInc = header.indexOf("B19013_001E");
  const iPop = header.indexOf("B01003_001E");
  const iPlace = header.indexOf("place");
  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n > -600000000 ? n : null;
  };
  const map = new Map<string, { income: number | null; pop: number | null }>();
  for (const r of rows.slice(1)) map.set(r[iPlace], { income: num(r[iInc]), pop: num(r[iPop]) });
  return map;
}

async function main() {
  const { regions } = JSON.parse(readFileSync(REGIONS_PATH, "utf8")) as { regions: RegionEntry[] };
  const current = JSON.parse(readFileSync(ACS_REGIONS_PATH, "utf8")) as {
    vintage: number;
    areas: Record<string, { medianIncome?: { value: number }; population?: { value: number } }>;
  };

  const [bls, base] = await Promise.all([fetchBls(), fetchAcsBase()]);
  console.log(`BLS: ${Object.keys(bls).length} counties; ACS ${BASE_VINTAGE}: ${base.size} places`);

  const areas: Record<string, AreaTrend> = {};
  const incomeChanges: number[] = [];
  for (const r of regions) {
    const then = base.get(r.placeFips);
    const now = current.areas[r.id];
    if (!then || !now) continue;
    const incomeChangePct =
      then.income && now.medianIncome ? now.medianIncome.value / then.income - 1 : null;
    const popChangePct =
      then.pop && then.pop > 500 && now.population ? now.population.value / then.pop - 1 : null;
    if (incomeChangePct == null && popChangePct == null) continue;
    areas[r.id] = { incomeChangePct, popChangePct };
    if (incomeChangePct != null) incomeChanges.push(incomeChangePct);
  }
  incomeChanges.sort((a, b) => a - b);
  const medianIncomeChangePct = incomeChanges[Math.floor(incomeChanges.length / 2)] ?? null;

  console.log(
    `Trajectory for ${Object.keys(areas).length} regions; regional median income change ${(
      (medianIncomeChangePct ?? 0) * 100
    ).toFixed(1)}%`
  );

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        baselinePeriod: `ACS ${BASE_VINTAGE - 4}-${BASE_VINTAGE} 5-year`,
        currentPeriod: `ACS ${current.vintage - 4}-${current.vintage} 5-year`,
        blsSource: "U.S. Bureau of Labor Statistics, Local Area Unemployment Statistics",
        medianIncomeChangePct,
        counties: bls,
        areas,
      },
      null,
      1
    ) + "\n"
  );
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
