import Link from "next/link";
import type { RegionSnapshot } from "@/lib/regions";
import { schoolOutcomeText } from "@/lib/outcomes-overlay";

/**
 * Compact panel shown next to the map on /explore/[id] for the 330
 * coverage-tier (non-pilot) regions. Deliberately thinner than SummaryCard:
 * sourced metrics and schools only, no strengths/tradeoffs narrative or
 * component scores, since those are pilot-area-only.
 */
export function RegionExploreSummary({ snapshot }: { snapshot: RegionSnapshot }) {
  const { region, metrics, schools } = snapshot;
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">{region.name}</h2>
        <span className="rounded-md bg-gold-light px-2 py-0.5 text-xs font-semibold text-gold">
          Data snapshot
        </span>
      </div>
      <p className="text-sm text-ink-3">{region.county}</p>

      {metrics.length > 0 && (
        <div className="mt-4">
          {metrics.slice(0, 6).map((m) => (
            <div
              key={m.label}
              className="flex items-baseline justify-between border-b border-canvas py-1.5 text-sm"
            >
              <span className="text-ink-2">{m.label}</span>
              <span className="font-semibold text-ink">{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {schools.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-2">Schools nearby</h3>
          <ul className="mt-1.5 space-y-1.5 text-sm text-ink-2">
            {schools.slice(0, 5).map((s) => {
              const outcome = schoolOutcomeText(s.cdsCode);
              return (
                <li key={s.name}>
                  {s.name} <span className="text-ink-3">· {s.distanceMiles} mi</span>
                  {outcome && <div className="text-xs font-semibold text-brand">{outcome}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/area/${region.id}`}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Full data snapshot
        </Link>
        <Link
          href="/methodology"
          className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-light"
        >
          Methodology
        </Link>
      </div>

      <p className="mt-4 rounded-lg bg-canvas p-3 text-xs text-ink-3">{snapshot.disclaimer}</p>
    </div>
  );
}
