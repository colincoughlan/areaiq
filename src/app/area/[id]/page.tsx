import Link from "next/link";
import { notFound } from "next/navigation";
import { AREA_ORDER, getArea, STATUS_LABEL } from "@/lib/areas";
import { acsChildBrackets, acsExtras, withAcs } from "@/lib/acs-overlay";
import { permitHighlights, withPermits } from "@/lib/permits-overlay";
import { schoolsMeta, withSchools } from "@/lib/schools-overlay";
import { amenitiesMeta, withAmenities } from "@/lib/amenities-overlay";
import { countyUnemploymentText } from "@/lib/trends-overlay";
import { PILOT_SECTION_ORDER } from "@/lib/lens";
import { AskAreaIQ } from "@/components/AskAreaIQ";
import { LensLayout } from "@/components/LensLayout";
import { LocalOffers } from "@/components/LocalOffers";
import { NearbyBusinessSearch } from "@/components/NearbyBusinessSearch";
import { NeighborhoodPulse } from "@/components/NeighborhoodPulse";
import { PermitActivity } from "@/components/PermitActivity";
import { RegionSnapshotView } from "@/components/RegionSnapshotView";
import { SummaryCard } from "@/components/SummaryCard";
import { buildRegionSnapshot, listRegions } from "@/lib/regions";
import { SourceTag } from "@/components/Badges";
import type { Sourced } from "@/lib/types";

export function generateStaticParams() {
  const pilotIds = new Set<string>(AREA_ORDER);
  return [
    ...AREA_ORDER.map((id) => ({ id })),
    ...listRegions()
      .filter((r) => !pilotIds.has(r.id))
      .map((r) => ({ id: r.id })),
  ];
}

function MetricRow({ label, m }: { label: string; m: Sourced<string> }) {
  return (
    <div className="flex items-baseline justify-between border-b border-canvas py-2 text-sm">
      <span className="text-ink-2">{label}</span>
      <span className="font-semibold">
        {m.value}
        <SourceTag name={m.sourceName} />
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-xl border border-line bg-white p-6">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-3 text-sm text-ink-2">{children}</div>
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-brand-light text-brand",
  proposed: "bg-gold-light text-gold",
  "under-construction": "bg-blue-50 text-blue-700",
  completed: "bg-gray-100 text-ink-2",
};

export default function AreaReportPage({ params }: { params: { id: string } }) {
  const base = getArea(params.id);
  if (!base) {
    const snapshot = buildRegionSnapshot(params.id);
    if (snapshot) return <RegionSnapshotView snapshot={snapshot} />;
    notFound();
  }
  const area = withAmenities(withSchools(withPermits(withAcs(base))));
  const extras = acsExtras(area.id);
  const childBrackets = acsChildBrackets(area.id);
  const permits = permitHighlights(area.id);
  const schoolSrc = schoolsMeta(area.id);
  const amenSrc = amenitiesMeta(area.id);
  const jobs = countyUnemploymentText(area.county);

  const sections: Record<string, React.ReactNode> = {
    narrative: (
      <Section title="What this area is like">
        <p>
          {area.narrative}
          <SourceTag name="AI summary" ai />
        </p>
      </Section>
    ),
    changing: (
      <Section title="What is changing">
        <p>
          {area.changing}
          <SourceTag name="AI summary" ai />
        </p>
      </Section>
    ),
    housing: (
      <Section title="Housing & ownership">
        <MetricRow label="Owner-occupied" m={area.housing.ownerOccupied} />
        <MetricRow label="Renter-occupied" m={area.housing.renterOccupied} />
        <MetricRow label="Vacancy" m={area.housing.vacancy} />
        <MetricRow label="Median sale price" m={area.housing.medianPrice} />
        <MetricRow label="Housing age" m={area.housing.housingAge} />
        <MetricRow label="Residential permits (24 mo)" m={area.housing.permits24mo} />
        {extras.map(({ label, metric }) => (
          <MetricRow key={label} label={label} m={metric} />
        ))}
        {jobs && (
          <p className="mt-3 text-xs text-ink-3">
            {jobs.text}. <SourceTag name={jobs.source} />
          </p>
        )}
      </Section>
    ),
    demographics: childBrackets.length > 0 && (
      <Section title="Children by age">
        {childBrackets.map(({ label, metric }) => (
          <MetricRow key={label} label={label} m={metric} />
        ))}
        <p className="mt-3 text-xs text-ink-3">
          Age brackets are the Census Bureau&apos;s own breakdown, not school-stage boundaries.
        </p>
      </Section>
    ),
    pulse: <NeighborhoodPulse areaId={area.id} />,
    offers: <LocalOffers areaId={area.id} />,
    amenities: (
      <Section title="Amenities & daily life">
        <p>{area.amenitiesSummary}</p>
        <div className="mt-3">
          {area.amenityDetail.map(([k, v]) => (
            <div
              key={k}
              className="flex items-baseline justify-between border-b border-canvas py-2"
            >
              <span>{k}</span>
              <span className="font-semibold text-ink">{v}</span>
            </div>
          ))}
        </div>
        {amenSrc && (
          <p className="mt-3 text-xs text-ink-3">
            Counts within {amenSrc.radiusMiles} mi as mapped in OpenStreetMap — coverage
            varies by area.
            <SourceTag name={`${amenSrc.source} (${amenSrc.retrievedAt})`} />
          </p>
        )}
      </Section>
    ),
    businessSearch: <NearbyBusinessSearch areaId={area.id} />,
    schools: (
      <Section title="Schools & education">
        {area.schools.map((sch) => (
          <div
            key={sch.name}
            className="flex items-baseline justify-between border-b border-canvas py-2"
          >
            <span>
              {sch.name} · {sch.district}
            </span>
            <span className="font-semibold text-ink">{sch.note}</span>
          </div>
        ))}
        <p className="mt-3 text-xs text-ink-3">
          AreaIQ shows official directory data rather than a single third-party rating.
          {schoolSrc && (
            <>
              {" "}
              Schools within {schoolSrc.radiusMiles} mi of the area center.
              <SourceTag name={`${schoolSrc.source} (${schoolSrc.retrievedAt})`} />
            </>
          )}
        </p>
      </Section>
    ),
    mobility: (
      <Section title="Mobility & commute">
        <p>{area.mobility}</p>
      </Section>
    ),
    development: (
      <Section title="Development & investment">
        <div className="space-y-3">
          {area.projects.map((p) => (
            <div key={p.name} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-ink">{p.name}</span>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[p.status]}`}
                >
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-3">
                {p.type} · {p.size}
                <br />
                {p.dates} · {p.agency}
              </p>
              <p className="mt-2 text-sm">
                {p.possibleEffects}
                <SourceTag name="AI interpretation" ai />
              </p>
            </div>
          ))}
        </div>
        {permits && <PermitActivity data={permits} />}
      </Section>
    ),
    environment: (
      <Section title="Environment & risk">
        <p>{area.environment}</p>
        <p className="mt-3 rounded-lg bg-canvas p-3 text-xs text-ink-3">
          Risk designations change; always verify against current official maps (CAL FIRE, FEMA,
          CARB) before a purchase decision.
        </p>
      </Section>
    ),
    sources: (
      <Section title="Sources & methodology">
        <p>
          Every material claim carries a source label. Component scores (Daily Life, Housing,
          FutureScore) are shown instead of a single ranking; protected characteristics are never
          used to score or recommend areas. Confidence reflects data recency and margin of error.
          Phase 1 uses illustrative sample data throughout — live sources arrive in Phase 2. Full
          source list on the{" "}
          <Link href="/methodology" className="underline">
            methodology page
          </Link>
          .
        </p>
      </Section>
    ),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
      <SummaryCard area={area} />

      <LensLayout sections={sections} order={PILOT_SECTION_ORDER} />

      <AskAreaIQ areaId={area.id} />

      <div className="mt-6 flex gap-2">
        <Link
          href={`/explore/${area.id}`}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Explore the map
        </Link>
        <Link
          href={`/compare?a=${area.id}`}
          className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-light"
        >
          Compare with another area
        </Link>
      </div>
    </main>
  );
}
