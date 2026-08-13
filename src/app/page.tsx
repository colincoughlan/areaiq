import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { listAreas } from "@/lib/areas";

export default function HomePage() {
  const areas = listAreas();
  return (
    <main className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
        Understand the area
        <br />
        before you buy the property.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-ink-2">
        Housing, ownership, schools, development and local risk for{" "}
        <strong>334 cities and communities</strong> across Los Angeles, Orange, Riverside,
        San Bernardino and Ventura counties — with a source behind every claim.
      </p>

      <div className="mx-auto mt-8 max-w-xl">
        <SearchBar />
        <p className="mt-2 text-sm text-ink-3">
          Search covers all 334 places — try &quot;Torrance,&quot; &quot;Pasadena,&quot; or
          &quot;Anaheim.&quot; Or{" "}
          <Link href="/find" className="font-semibold text-brand underline">
            browse by budget and must-haves
          </Link>
          .
        </p>
      </div>

      <p className="mt-6 text-sm text-ink-3">
        These 4 have full editorial reports (development pipeline, permits, component scores,
        Ask AreaIQ) — every other searchable place gets a real-data snapshot instead:
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {areas.map((a) => (
          <Link
            key={a.id}
            href={`/area/${a.id}`}
            className="rounded-full border border-line bg-white px-4 py-1.5 text-sm text-ink-2 hover:border-brand hover:text-brand"
          >
            {a.name} · {a.county.replace(" County", "")}
          </Link>
        ))}
      </div>

      <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
        {[
          [
            "See what's coming",
            "Approved and proposed developments, permits and public investment — not just what's there today.",
          ],
          [
            "Evidence, not opinion",
            "Every insight is labeled: official record, government dataset, or AI interpretation.",
          ],
          [
            "Tradeoffs, not labels",
            "No neighborhood is “good” or “bad.” We explain strengths and tradeoffs so you decide what fits.",
          ],
        ].map(([h, b]) => (
          <div key={h} className="rounded-xl border border-line bg-white p-5">
            <h3 className="font-bold">{h}</h3>
            <p className="mt-1 text-sm text-ink-2">{b}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
