import Link from "next/link";
import type { RegionSnapshot } from "@/lib/regions";
import { marketRows } from "@/lib/market-overlay";
import { schoolOutcomeText } from "@/lib/outcomes-overlay";
import { SNAPSHOT_SECTION_ORDER } from "@/lib/lens";
import { CommunityDirectory } from "./CommunityDirectory";
import { LensLayout } from "./LensLayout";
import { LocalOffers } from "./LocalOffers";
import { NearbyBusinessSearch } from "./NearbyBusinessSearch";
import { SourceTag } from "./Badges";

const CONF_STYLE: Record<string, string> = {
  high: "bg-brand-light text-brand",
  medium: "bg-gold-light text-gold",
  limited: "bg-gray-100 text-ink-3",
};

export function RegionSnapshotView({ snapshot }: { snapshot: RegionSnapshot }) {
  const { region, metrics, highlights, schools, schoolsSource, childBrackets } = snapshot;
  const market = marketRows(region.id);

  const sections: Record<string, React.ReactNode> = {
    offers: <LocalOffers areaId={region.id} />,
    highlights: highlights.length > 0 && (
      <section className="mt-4 rounded-xl border border-line bg-white p-6">
        <h2 className="text-base font-bold">How this place compares</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-2">
          {highlights.map((h) => (
            <li key={h} className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand" />
              <span>
                {h}
                <SourceTag name={`U.S. Census ${snapshot.period}`} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    ),
    market: market && (
      <section className="mt-4 rounded-xl border border-line bg-white p-6">
        <h2 className="text-base font-bold">Housing market</h2>
        <div className="mt-2">
          {market.rows.map((r) => (
            <div
              key={r.label}
              className="flex items-baseline justify-between gap-3 border-b border-canvas py-2 text-sm"
            >
              <span className="text-ink-2">{r.label}</span>
              <span className="font-semibold">{r.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-3">
          {market.source}. Period ending {market.periodEnd}.
        </p>
      </section>
    ),
    metrics: (
      <section className="mt-4 rounded-xl border border-line bg-white p-6">
        <h2 className="text-base font-bold">Housing & households</h2>
        <div className="mt-2">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex items-baseline justify-between gap-3 border-b border-canvas py-2 text-sm"
            >
              <span className="text-ink-2">{m.label}</span>
              <span className="flex items-baseline gap-2 font-semibold">
                {m.value}
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${CONF_STYLE[m.confidence]}`}>
                  {m.confidence}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Source: U.S. Census {snapshot.period}. Confidence reflects the margin of error at
          this geography&apos;s size.
        </p>
      </section>
    ),
    demographics: childBrackets.length > 0 && (
      <section className="mt-4 rounded-xl border border-line bg-white p-6">
        <h2 className="text-base font-bold">Children by age</h2>
        <div className="mt-2">
          {childBrackets.map((b) => (
            <div
              key={b.label}
              className="flex items-baseline justify-between gap-3 border-b border-canvas py-2 text-sm"
            >
              <span className="text-ink-2">{b.label}</span>
              <span className="flex items-baseline gap-2 font-semibold">
                {b.value}
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${CONF_STYLE[b.confidence]}`}>
                  {b.confidence}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Source: U.S. Census {snapshot.period}. Age brackets are the Census Bureau&apos;s own
          breakdown, not school-stage boundaries.
        </p>
      </section>
    ),
    schools: schools.length > 0 && (
      <section className="mt-4 rounded-xl border border-line bg-white p-6">
        <h2 className="text-base font-bold">Schools nearby</h2>
        <div className="mt-2">
          {schools.map((s) => {
            const outcome = schoolOutcomeText(s.cdsCode);
            return (
              <div key={s.name} className="border-b border-canvas py-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span>
                    {s.name} <span className="text-ink-3">· {s.district}</span>
                  </span>
                  <span className="whitespace-nowrap text-xs text-ink-3">
                    {s.socType} · {s.grades} · {s.distanceMiles} mi
                  </span>
                </div>
                {outcome && (
                  <p className="mt-0.5 text-xs font-semibold text-brand">{outcome}</p>
                )}
              </div>
            );
          })}
        </div>
        {schoolsSource && (
          <p className="mt-3 text-xs text-ink-3">
            Within {schoolsSource.radiusMiles} mi of the {region.kind === "cdp" ? "community" : "city"} center.
            <SourceTag name={`${schoolsSource.source} (${schoolsSource.retrievedAt})`} />
          </p>
        )}
      </section>
    ),
    businessSearch: <NearbyBusinessSearch areaId={region.id} />,
    community: <CommunityDirectory areaId={region.id} />,
    cta: (
      <section className="mt-4 rounded-xl border border-line bg-white p-6 text-sm text-ink-2">
        <h2 className="text-base font-bold text-ink">Want the full picture?</h2>
        <p className="mt-2">
          Full Area Intelligence Reports — development pipeline, permits, amenities, component
          scores, and Ask AreaIQ — are live for pilot areas while we expand coverage:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["highland-park", "eastvale", "fontana-southridge", "claremont"].map((id) => (
            <Link
              key={id}
              href={`/area/${id}`}
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-brand hover:border-brand"
            >
              {id.replace(/-/g, " ")}
            </Link>
          ))}
        </div>
      </section>
    ),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
      <div className="rounded-xl border border-line bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">{region.name}</h1>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-ink-2">
            {region.kind === "cdp" ? "Census-designated place" : "City"}
          </span>
          <span className="rounded-md bg-gold-light px-2 py-0.5 text-xs font-semibold text-gold">
            Data snapshot
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-3">{region.county}</p>
        <div className="mt-3">
          <Link
            href={`/explore/${region.id}`}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Explore the map
          </Link>
        </div>
        <p className="mt-3 rounded-lg bg-canvas p-3 text-xs text-ink-3">
          {snapshot.disclaimer}{" "}
          <Link href="/methodology" className="underline">
            How this works
          </Link>
        </p>
      </div>

      <LensLayout sections={sections} order={SNAPSHOT_SECTION_ORDER} />
    </main>
  );
}
