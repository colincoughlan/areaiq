/**
 * School outcomes (graduation rates) ingestion. Usage:
 *   npm run ingest:outcomes
 *
 * Reads the CDE ACGR file (ACGR_FILE env or download), keeps outcomes only for
 * schools already in our generated school lists, writes
 * src/lib/generated/school-outcomes.json.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAcgr, type SchoolOutcome } from "../src/lib/school-outcomes";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "src/lib/generated/school-outcomes.json");
const ACGR_URL = "https://www3.cde.ca.gov/demo-downloads/acgr/acgr24.txt";

async function loadAcgr(): Promise<string> {
  if (process.env.ACGR_FILE) return readFileSync(process.env.ACGR_FILE, "utf8");
  console.log("Downloading CDE ACGR file (~16MB)…");
  const res = await fetch(ACGR_URL);
  if (!res.ok) throw new Error(`ACGR download failed: ${res.status}`);
  return await res.text();
}

function collectCds(): Set<string> {
  const cds = new Set<string>();
  for (const file of ["schools.json", "schools-regions.json"]) {
    try {
      const data = JSON.parse(readFileSync(join(ROOT, "src/lib/generated", file), "utf8")) as {
        areas: Record<string, { schools?: { cdsCode?: string }[] } | { cdsCode?: string }[]>;
      };
      for (const v of Object.values(data.areas)) {
        const list = Array.isArray(v) ? v : (v.schools ?? []);
        for (const s of list) if (s.cdsCode) cds.add(s.cdsCode);
      }
    } catch {
      console.warn(`- could not read ${file}; run the schools ingestion first`);
    }
  }
  return cds;
}

async function main() {
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const acgr = parseAcgr(await loadAcgr());
  console.log(
    `ACGR ${acgr.academicYear}: ${Object.keys(acgr.byCds).length} schools; state grad rate ${acgr.stateGradRate}%`
  );

  const wanted = collectCds();
  const schools: Record<string, SchoolOutcome> = {};
  let matched = 0;
  for (const cds of wanted) {
    const o = acgr.byCds[cds];
    if (o && o.gradRate != null) {
      schools[cds] = o;
      matched++;
    }
  }
  console.log(
    `Matched outcomes for ${matched} of ${wanted.size} known schools ` +
      `(elementary/middle schools have no cohort — high schools only, as expected)`
  );

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: retrievedAt,
        source: `CA Dept. of Education ACGR ${acgr.academicYear}`,
        academicYear: acgr.academicYear,
        stateGradRate: acgr.stateGradRate,
        stateUcCsuRate: acgr.stateUcCsuRate,
        schools,
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
