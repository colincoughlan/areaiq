import { formatUsdCompact, type PermitHighlights } from "@/lib/permits-overlay";
import { SourceTag } from "./Badges";

/** Real permit activity block for the Development section. */
export function PermitActivity({ data }: { data: PermitHighlights }) {
  const stats: [string, string][] = [
    ["Permits issued", data.total.toLocaleString("en-US")],
    ["New buildings", String(data.newBuildings)],
    ["Additions", String(data.additions)],
    ["Demolitions", String(data.demolitions)],
    ["Stated valuation", formatUsdCompact(data.valuationTotal)],
  ];
  return (
    <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">
          Recent permit activity (since {data.since})
        </h3>
        <SourceTag name="LA Building & Safety" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map(([label, v]) => (
          <div key={label} className="rounded-md bg-white px-2 py-2 text-center">
            <div className="text-lg font-extrabold text-brand">{v}</div>
            <div className="text-[10px] uppercase tracking-wide text-ink-3">{label}</div>
          </div>
        ))}
      </div>
      {data.notable.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-ink-3">
            Largest recent permits by stated valuation
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {data.notable.map((p) => (
              <li key={p.permitNbr} className="text-xs text-ink-2">
                <span className="font-semibold text-ink">{p.address}</span> ·{" "}
                {p.valuation != null ? formatUsdCompact(p.valuation) : "—"} · {p.type} ·{" "}
                {p.issueDate}
                {p.workDesc && (
                  <span className="text-ink-3"> — {p.workDesc.toLowerCase().slice(0, 90)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[11px] text-ink-3">
        Public records, retrieved {data.retrievedAt}. Valuations are applicant-stated at
        filing and not verified.
      </p>
    </div>
  );
}
