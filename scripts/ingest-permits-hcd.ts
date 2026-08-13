/**
 * Building-permit ingestion for pilot cities without their own open-data API
 * (Eastvale, Fontana, Claremont) via CA HCD's Annual Progress Report "Table
 * A2" — a public, statewide, no-key-required CSV every CA jurisdiction files
 * under Gov. Code §65400. Usage:
 *   npm run ingest:permits-hcd
 *
 * ~300MB streamed from data.ca.gov. Merges into the same
 * src/lib/generated/permits.json that ingest-permits.ts (LA City/Highland
 * Park) writes — this script only touches the three HCD-mapped areas, it
 * never overwrites Highland Park's entry.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HCD_JURISDICTION_MAP,
  normalizeHcdPermit,
  parseCsvLine,
  rowToObject,
} from "../src/lib/permits-hcd";
import { freshnessConfidence, summarizePermits, type AreaPermitData, type PermitRecord } from "../src/lib/permits";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src/lib/generated/permits.json");
const SOURCE_URL =
  "https://data.ca.gov/dataset/81b0841f-2802-403e-b48e-2ef4b751f77c/resource/fe505d9b-8c36-42ba-ba30-08bc4f34e022/download/tablea2.csv";
const PERIOD_MONTHS = 24;

function sinceDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - PERIOD_MONTHS);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const since = sinceDate();

  const localFile = process.env.HCD_APR_FILE;
  const stream = localFile
    ? (await import("node:fs")).createReadStream(localFile)
    : Readable.fromWeb((await fetch(SOURCE_URL)).body as import("stream/web").ReadableStream);

  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let header: string[] | null = null;
  const byArea: Record<string, PermitRecord[]> = {};
  for (const areaId of Object.values(HCD_JURISDICTION_MAP)) byArea[areaId] = [];
  let scanned = 0;

  for await (const line of rl) {
    if (!header) {
      header = parseCsvLine(line);
      continue;
    }
    scanned++;
    const fields = parseCsvLine(line);
    const row = rowToObject(header, fields);
    const areaId = HCD_JURISDICTION_MAP[(row.JURIS_NAME ?? "").trim().toUpperCase()];
    if (!areaId) continue;

    const rec = normalizeHcdPermit(row);
    if (!rec) continue;
    if (rec.issueDate < since) continue;
    byArea[areaId].push(rec);
  }

  console.log(`Scanned ${scanned.toLocaleString("en-US")} statewide rows`);

  // Merge into the existing permits.json rather than overwrite (LA/Highland Park
  // is written by ingest-permits.ts and must survive re-running this script).
  const existing: { areas: Record<string, AreaPermitData> } = existsSync(OUT_PATH)
    ? JSON.parse(readFileSync(OUT_PATH, "utf8"))
    : { areas: {} };

  for (const [areaId, records] of Object.entries(byArea)) {
    const summary = summarizePermits(records);
    existing.areas[areaId] = {
      source: "CA Dept. of Housing & Community Development, Annual Progress Report (Table A2)",
      datasetId: "housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year",
      periodMonths: PERIOD_MONTHS,
      since,
      retrievedAt,
      confidence: freshnessConfidence(summary.newestIssueDate, retrievedAt),
      summary,
    };
    console.log(
      `✓ ${areaId}: ${summary.total} permits since ${since} ` +
        `(newest ${summary.newestIssueDate ?? "none"})`
    );
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ generatedAt: retrievedAt, areas: existing.areas }, null, 2) + "\n"
  );
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
