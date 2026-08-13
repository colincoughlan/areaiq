import Link from "next/link";
import { CATEGORY_LABELS, type AmenityCategory } from "@/lib/amenities";
import { getMatchCandidates } from "@/lib/region-match-data";
import { rankRegions } from "@/lib/region-match";

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as AmenityCategory[];

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default function FindPage({
  searchParams,
}: {
  searchParams: { rent?: string; cat?: string | string[] };
}) {
  const rentRaw = searchParams.rent?.trim();
  const maxRent = rentRaw && /^\d+$/.test(rentRaw) ? Number(rentRaw) : null;
  const selectedCategories = toArray(searchParams.cat).filter((c): c is AmenityCategory =>
    ALL_CATEGORIES.includes(c as AmenityCategory)
  );
  const hasQuery = searchParams.rent != null || selectedCategories.length > 0;

  const { candidates, coverage } = getMatchCandidates();
  const results = hasQuery
    ? rankRegions(candidates, { maxRent, categories: selectedCategories })
    : [];

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Find an area that fits</h1>
      <p className="mt-2 text-sm text-ink-2">
        Set a rent ceiling and the things you don&apos;t want to give up — this filters, it
        never scores or ranks by anything but the criteria you pick.
      </p>

      <form
        method="get"
        className="mt-5 rounded-xl border border-line bg-white p-6"
      >
        <label className="block text-sm font-semibold text-ink">
          Max median rent (monthly)
          <input
            type="number"
            name="rent"
            min={0}
            step={50}
            defaultValue={rentRaw ?? ""}
            placeholder="e.g. 2200"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>
        <p className="mt-1 text-xs text-ink-3">
          Compares against each area&apos;s U.S. Census median gross rent — not a specific
          listing price.
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-ink">Must have nearby</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
            {ALL_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-1.5 text-sm text-ink-2">
                <input
                  type="checkbox"
                  name="cat"
                  value={cat}
                  defaultChecked={selectedCategories.includes(cat)}
                  className="rounded border-line"
                />
                {CATEGORY_LABELS[cat]}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="mt-4 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Search
        </button>
      </form>

      {hasQuery && (
        <div className="mt-5">
          <p className="text-sm text-ink-2">
            {results.length} of {coverage.totalCandidates} covered SoCal places match.
          </p>
          {coverage.withAmenityData < coverage.totalCandidates && (
            <p className="mt-1 rounded-lg bg-canvas p-3 text-xs text-ink-3">
              Amenity data is currently ingested for {coverage.withAmenityData} of{" "}
              {coverage.totalCandidates} places ({coverage.withRentData} have rent data). Places
              without amenity data are excluded from &quot;must have nearby&quot; results rather
              than guessed at — coverage expands as more areas are ingested.
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {results.map((r) => (
              <li key={r.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/area/${r.id}`} className="font-semibold text-brand hover:underline">
                    {r.name}
                  </Link>
                  <span className="text-xs text-ink-3">{r.county}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-2">
                  {r.medianRent != null && (
                    <span>Median rent ${Math.round(r.medianRent).toLocaleString("en-US")}/mo</span>
                  )}
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-ink-3">
                    {r.tier === "pilot" ? "Full report" : "Data snapshot"}
                  </span>
                </div>
                {r.matchedCategories.length > 0 && (
                  <p className="mt-1 text-xs text-ink-3">
                    Has: {r.matchedCategories.map((c) => CATEGORY_LABELS[c]).join(", ")}
                  </p>
                )}
              </li>
            ))}
            {results.length === 0 && (
              <li className="rounded-lg bg-canvas p-4 text-sm text-ink-2">
                No covered place matches all of those criteria yet. Try loosening the budget or
                dropping a &quot;must have.&quot;
              </li>
            )}
          </ul>
        </div>
      )}
    </main>
  );
}
