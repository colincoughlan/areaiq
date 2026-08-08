import Link from "next/link";
import type { Area } from "@/lib/types";
import { computeAccessScore } from "@/lib/access";
import { ConfidenceBadge, DirectionBadge, RiskBadge } from "./Badges";
import { ScoreTiles } from "./ScoreTiles";

export function SummaryCard({ area, compact }: { area: Area; compact?: boolean }) {
  const access = computeAccessScore(area.id);
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <h2 className="text-lg font-bold">{area.sampleAddress}</h2>
      <p className="text-sm text-ink-3">
        {area.name} · {area.county}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <DirectionBadge area={area} />
        <ConfidenceBadge level={area.scores.confidence} />
        <RiskBadge text={area.riskHeadline} />
      </div>

      <ScoreTiles scores={area.scores} className="mt-4" />

      {access && (
        <div className="mt-3 rounded-lg border border-line bg-canvas px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-ink">15-minute neighborhood</span>
            <span className="text-sm font-extrabold text-brand">
              {access.within} of {access.total} essentials within a 15-min walk
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
            {access.essentials
              .filter((e) => e.within && e.nearestName)
              .slice(0, 4)
              .map((e) => `${e.label}: ${e.nearestName} (${e.nearestMiles} mi)`)
              .join(" · ")}
          </p>
          <p className="mt-1 text-[10px] text-ink-3">
            Nearest mapped place per category, straight-line ≤1 mi. {access.sources}
          </p>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-good">Strengths</h3>
        <ul className="mt-1.5 space-y-1.5 text-sm text-ink-2">
          {area.strengths.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-good" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-warn">Tradeoffs</h3>
        <ul className="mt-1.5 space-y-1.5 text-sm text-ink-2">
          {area.tradeoffs.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-warn" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {!compact && (
        <div className="mt-5 flex flex-wrap gap-2">
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
            Compare
          </Link>
        </div>
      )}

      <p className="mt-4 rounded-lg bg-canvas p-3 text-xs text-ink-3">
        Component scores are shown instead of a single overall number — see Sources &amp;
        methodology. All figures are illustrative sample data.
      </p>
    </div>
  );
}
