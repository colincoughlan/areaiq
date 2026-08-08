import { trendPeriods } from "@/lib/trends-overlay";

export const metadata = { title: "Methodology — AreaIQ" };

function Row({ source, use, cadence }: { source: string; use: string; cadence: string }) {
  return (
    <div className="border-b border-canvas py-3">
      <div className="font-semibold text-ink">{source}</div>
      <div className="mt-0.5 text-sm text-ink-2">{use}</div>
      <div className="mt-0.5 text-xs text-ink-3">{cadence}</div>
    </div>
  );
}

export default function MethodologyPage() {
  const { baseline, current } = trendPeriods();

  const sources: { source: string; use: string; cadence: string }[] = [
    {
      source: "U.S. Census Bureau, American Community Survey (5-year estimates)",
      use: "Owner/renter split, vacancy, median household income, median gross rent, median year built, population, unemployment rate. Every ACS figure carries a margin-of-error-based confidence label (high/medium/limited).",
      cadence: "Refreshed as new ACS vintages release; current vintage 2020-2024.",
    },
    {
      source: "City of Los Angeles open-data portal (building permits)",
      use: "Residential and commercial permit activity for Highland Park — the one pilot area with a working per-city adapter today. Other pilot areas will get adapters as the moat expands.",
      cadence: "Pulled on ingestion; dataset updates continuously on the city's side.",
    },
    {
      source: "California Dept. of Education — school directory + Adjusted Cohort Graduation Rate (ACGR)",
      use: "Nearby school listings (name, district, grade span, distance) plus, for high schools with a reporting cohort, graduation rate and UC/CSU-eligibility rate against the statewide baseline. Schools flagged by CDE for small-cohort privacy suppression show no rate rather than a misleading number.",
      cadence: "Directory and ACGR are annual CDE releases.",
    },
    {
      source: "OpenStreetMap contributors, via the Overpass API",
      use: "Nearby grocery, pharmacy, food, parks, libraries, healthcare, fitness, childcare, and transit points, and the 15-minute access score (share of 8 daily-life categories with something reachable within about a mile).",
      cadence: "Snapshot at ingestion time; OSM coverage varies by area and is crowd-maintained.",
    },
    {
      source: "U.S. Bureau of Labor Statistics — Local Area Unemployment Statistics (LAUS)",
      use: "County-level unemployment rate, shown with a year-ago comparison for context.",
      cadence: `Monthly; latest period reflected in each area's report.`,
    },
    {
      source: "ACS non-overlapping 5-year windows",
      use: `Trajectory evidence — how a place's median income and population changed between the ${baseline ?? "prior"} and ${current ?? "current"} periods, shown against the five-county median change. This is the closest thing AreaIQ shows to "up-and-coming": a sourced trend, not a verdict.`,
      cadence: "Recomputed when a new ACS vintage becomes the current window.",
    },
    {
      source: "Redfin Data Center (public market tracker)",
      use: "Median sale price, days on market, and inventory, where available.",
      cadence: "Monthly; being phased in — not all areas have live figures yet.",
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Methodology</h1>
      <p className="mt-3 max-w-xl text-ink-2">
        What AreaIQ shows, where it comes from, and the rules we hold ourselves to. This page
        applies to every report — the four full pilot-area reports and the data-driven coverage
        snapshots for the rest of Southern California.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Two tiers of report</h2>
        <p className="mt-2 text-sm text-ink-2">
          Highland Park, Eastvale, Fontana/Southridge, and Claremont get full editorial reports:
          hand-written strengths/tradeoffs narrative, development project tracking, and the
          Ask AreaIQ assistant, all layered on top of the same sourced data below. Every other
          city and community in the five-county area gets a coverage snapshot — official
          statistics and deterministic comparisons only, with no editorial narrative and no
          component scores, so nothing is asserted without a number behind it.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Data sources</h2>
        <div className="mt-2">
          {sources.map((s) => (
            <Row key={s.source} source={s.source} use={s.use} cadence={s.cadence} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Confidence labels</h2>
        <p className="mt-2 text-sm text-ink-2">
          Every sourced figure shows a confidence level rather than pretending all data is equally
          solid. <span className="font-semibold text-ink">High</span> means a large, recent sample
          with a tight margin of error. <span className="font-semibold text-ink">Medium</span>{" "}
          means a usable estimate with a wider margin of error. <span className="font-semibold text-ink">Limited</span> means small-sample or older data — still shown, but read with more
          caution. AreaIQ never hides the uncertainty to make a report look more polished.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Component scores, not one ranking</h2>
        <p className="mt-2 text-sm text-ink-2">
          Pilot-area reports show separate Daily Life, Housing, and FutureScore components instead
          of a single composite "AreaIQ score." A single ranking invites people to use it as a
          proxy for who lives where — component scores keep the comparison to concrete,
          independently checkable facts.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Fair housing</h2>
        <p className="mt-2 text-sm text-ink-2">
          AreaIQ never uses race, color, national origin, religion, sex, familial status, or
          disability — or any proxy for them — to score, filter, rank, or recommend an area. No
          report ever labels an area "good," "bad," "safe," or "unsafe." Every strengths list is
          paired with a tradeoffs list. Trajectory statements ("income rose X% vs. the regional
          median") are evidence, not a verdict, and are phrased the same way regardless of who
          lives in the area today.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Ask AreaIQ</h2>
        <p className="mt-2 text-sm text-ink-2">
          The AI assistant answers only from the sourced facts already shown for that area. Every
          answer must cite specific sources; answers that lack a citation, invent a source, use
          banned labeling language, or make a forecast ("will appreciate") are rejected before they
          reach you. AreaIQ never uses AI to fill gaps with speculation.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Local Offers &amp; Neighborhood Pulse</h2>
        <p className="mt-2 text-sm text-ink-2">
          Merchant offers and venue busyness are area-level features, not person-level targeting or
          tracking: offers are shown to anyone viewing an area, never targeted by demographic, and
          busyness reflects aggregated, anonymous check-ins with no individual identity exposed.
          Where live merchant data isn't configured yet, these sections show clearly labeled demo
          data so the feature is understandable even before a market has real merchants on board.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">What's not here yet</h2>
        <p className="mt-2 text-sm text-ink-2">
          Crime and safety data is intentionally not shown. It's spec'd internally but gated
          pending fair-housing legal review before any code is written, because crime statistics
          are unusually easy to misuse as a demographic proxy. We'd rather ship it right than ship
          it fast.
        </p>
      </section>

      <section className="mt-8 rounded-lg bg-canvas p-4 text-xs text-ink-3">
        Found something wrong or out of date? Every report includes a "Report an error" link in
        the footer — corrections are reviewed against the original source.
      </section>
    </main>
  );
}
