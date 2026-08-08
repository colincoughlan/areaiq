/**
 * Builds the numbered fact sheet an AI answer may draw from. Pure and
 * deterministic: same data in, same sheet out. Every fact carries a source id.
 */

import { getArea, STATUS_LABEL } from "../areas";
import { withAcs, acsExtras } from "../acs-overlay";
import { withPermits, permitHighlights, formatUsdCompact } from "../permits-overlay";
import { withSchools, schoolsMeta } from "../schools-overlay";
import { withAmenities, amenitiesMeta } from "../amenities-overlay";
import type { Sourced } from "../types";

export interface FactSource {
  id: string; // "S1"
  name: string;
  retrievedAt: string;
}

export interface AreaContext {
  areaId: string;
  areaName: string;
  factSheet: string; // numbered facts with [Sn] tags
  sources: FactSource[];
}

class SourceRegistry {
  private sources: FactSource[] = [];
  private byKey = new Map<string, string>();

  register(name: string, retrievedAt: string): string {
    const key = `${name}|${retrievedAt}`;
    const existing = this.byKey.get(key);
    if (existing) return existing;
    const id = `S${this.sources.length + 1}`;
    this.sources.push({ id, name, retrievedAt });
    this.byKey.set(key, id);
    return id;
  }

  all(): FactSource[] {
    return this.sources;
  }
}

const SAMPLE_NOTE = "Illustrative sample data (Phase 1)";

function tag(reg: SourceRegistry, m: Sourced<string>): string {
  const name = m.source === "sample-data" ? SAMPLE_NOTE : m.sourceName;
  const id = reg.register(name, m.retrievedAt);
  return `[${id}]`;
}

export function buildAreaContext(areaId: string): AreaContext | null {
  const base = getArea(areaId);
  if (!base) return null;
  const area = withAmenities(withSchools(withPermits(withAcs(base))));
  const reg = new SourceRegistry();
  const lines: string[] = [];

  const aiId = reg.register("AreaIQ editorial summary (pre-written, Phase 1)", "2026-08-01");
  lines.push(`Area: ${area.name}, ${area.county}. Direction: ${area.direction} — ${area.directionDetail} [${aiId}]`);
  lines.push(`Narrative: ${area.narrative} [${aiId}]`);
  lines.push(`What is changing: ${area.changing} [${aiId}]`);
  lines.push(
    `Component scores (0-100, ${area.scores.confidence} confidence): Daily Life ${area.scores.dailyLife}, Housing ${area.scores.housing}, FutureScore ${area.scores.futureScore} [${aiId}]`
  );
  for (const s of area.strengths) lines.push(`Strength: ${s} [${aiId}]`);
  for (const t of area.tradeoffs) lines.push(`Tradeoff: ${t} [${aiId}]`);
  lines.push(`Risk headline: ${area.riskHeadline} [${aiId}]`);
  lines.push(`Environment: ${area.environment} [${aiId}]`);
  lines.push(`Mobility: ${area.mobility} [${aiId}]`);

  const h = area.housing;
  lines.push(`Owner-occupied: ${h.ownerOccupied.value} (confidence: ${h.ownerOccupied.confidence}) ${tag(reg, h.ownerOccupied)}`);
  lines.push(`Renter-occupied: ${h.renterOccupied.value} (confidence: ${h.renterOccupied.confidence}) ${tag(reg, h.renterOccupied)}`);
  lines.push(`Vacancy: ${h.vacancy.value} (confidence: ${h.vacancy.confidence}) ${tag(reg, h.vacancy)}`);
  lines.push(`Median sale price: ${h.medianPrice.value} ${tag(reg, h.medianPrice)}`);
  lines.push(`Housing age: ${h.housingAge.value} ${tag(reg, h.housingAge)}`);
  lines.push(`Building permits (24 mo): ${h.permits24mo.value} (confidence: ${h.permits24mo.confidence}) ${tag(reg, h.permits24mo)}`);

  for (const extra of acsExtras(areaId)) {
    lines.push(`${extra.label}: ${extra.metric.value} (confidence: ${extra.metric.confidence}) ${tag(reg, extra.metric)}`);
  }

  const permits = permitHighlights(areaId);
  if (permits) {
    const pid = reg.register(permits.source, permits.retrievedAt);
    lines.push(
      `Permit detail since ${permits.since}: ${permits.total} total; ${permits.newBuildings} new buildings, ${permits.additions} additions, ${permits.demolitions} demolitions; stated valuation ${formatUsdCompact(permits.valuationTotal)} [${pid}]`
    );
    for (const p of permits.notable.slice(0, 3)) {
      lines.push(
        `Notable permit: ${p.address} — ${p.type} (${p.useDesc}), issued ${p.issueDate}, stated valuation ${p.valuation != null ? formatUsdCompact(p.valuation) : "n/a"} [${pid}]`
      );
    }
  }

  const sm = schoolsMeta(areaId);
  const schoolId = sm ? reg.register(sm.source, sm.retrievedAt) : aiId;
  for (const s of area.schools.slice(0, 6)) {
    lines.push(`School: ${s.name} (${s.district}) — ${s.note} [${schoolId}]`);
  }

  const am = amenitiesMeta(areaId);
  const amenityId = am ? reg.register(am.source, am.retrievedAt) : aiId;
  lines.push(`Amenities: ${area.amenitiesSummary} [${aiId}]`);
  for (const [k, v] of area.amenityDetail) {
    lines.push(`Amenity detail (within ${am ? am.radiusMiles : 2} mi): ${k}: ${v} [${amenityId}]`);
  }

  const projId = reg.register("Development project records (sample, Phase 1)", "2026-08-01");
  for (const p of area.projects) {
    lines.push(
      `Project: ${p.name} — ${p.type}, ${STATUS_LABEL[p.status]}, ${p.size}; ${p.dates}; ${p.agency} [${projId}]`
    );
  }

  return {
    areaId,
    areaName: area.name,
    factSheet: lines.map((l, i) => `${i + 1}. ${l}`).join("\n"),
    sources: reg.all(),
  };
}
