/**
 * Building-permit ingestion CLI (LA City proof of concept). Usage:
 *   npm run ingest:permits
 *
 * No key required. Optional app token via LA_OPEN_DATA_APP_TOKEN raises rate limits.
 * Writes src/lib/generated/permits.json for areas whose geography is an LA County
 * tract group (currently Highland Park).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GEOGRAPHIES } from "../src/lib/acs";
import {
  freshnessConfidence,
  normalizePermit,
  summarizePermits,
  tractToCt,
  type AreaPermitData,
  type PermitRecord,
  type RawPermitRow,
} from "../src/lib/permits";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src/lib/generated/permits.json");
const DATASET = "pi9x-tg5x";
const BASE = `https://data.lacity.org/resource/${DATASET}.json`;
const PERIOD_MONTHS = 24;
const PAGE = 1000;

function sinceDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - PERIOD_MONTHS);
  return d.toISOString().slice(0, 10);
}

async function fetchPage(where: string, offset: number): Promise<RawPermitRow[]> {
  const params = new URLSearchParams({
    $where: where,
    $order: "issue_date DESC",
    $limit: String(PAGE),
    $offset: String(offset),
    $select:
      "permit_nbr,primary_address,ct,permit_type,permit_sub_type,use_desc,work_desc,issue_date,status_desc,valuation,lat,lon",
  });
  const headers: Record<string, string> = {};
  if (process.env.LA_OPEN_DATA_APP_TOKEN) {
    headers["X-App-Token"] = process.env.LA_OPEN_DATA_APP_TOKEN;
  }
  const res = await fetch(`${BASE}?${params}`, { headers });
  if (!res.ok) throw new Error(`Socrata ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as RawPermitRow[];
}

async function main() {
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const since = sinceDate();
  const out: Record<string, AreaPermitData> = {};

  for (const [areaId, geo] of Object.entries(GEOGRAPHIES)) {
    // Proof of concept covers LA County tract-group areas (LA City data only).
    if (geo.kind !== "tract-group" || geo.county !== "037") continue;

    const cts = geo.tracts.map(tractToCt);
    const where = `ct in(${cts.map((c) => `'${c}'`).join(",")}) AND issue_date >= '${since}'`;

    const records: PermitRecord[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const rows = await fetchPage(where, offset);
      for (const r of rows) {
        const p = normalizePermit(r);
        if (p) records.push(p);
      }
      if (rows.length < PAGE) break;
      if (offset > 20 * PAGE) throw new Error("Unexpectedly many pages — check the filter");
    }

    const summary = summarizePermits(records);
    out[areaId] = {
      source: "LA Dept. of Building & Safety permits (data.lacity.org)",
      datasetId: DATASET,
      periodMonths: PERIOD_MONTHS,
      since,
      retrievedAt,
      confidence: freshnessConfidence(summary.newestIssueDate, retrievedAt),
      summary,
    };
    console.log(
      `✓ ${areaId}: ${summary.total} permits since ${since} ` +
        `(new bldg ${summary.newBuildings}, demo ${summary.demolitions}, ` +
        `newest ${summary.newestIssueDate})`
    );
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: retrievedAt, areas: out }, null, 2) + "\n");
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
