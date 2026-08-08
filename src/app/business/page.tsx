import { BusinessOfferForm } from "@/components/BusinessOfferForm";

export const metadata = { title: "AreaIQ for Local Businesses" };

export default function BusinessPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Fill your quiet hours.
        <br />
        Reach the neighbors who can walk in.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-ink-2">
        Post a time-limited offer — &ldquo;20% off today,&rdquo; &ldquo;quiet Tuesday, 30% off
        tonight&rdquo; — targeted to people exploring your neighborhood on AreaIQ. No upfront
        cost during beta.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["⚡", "Right-now offers", "Time-boxed deals with a live countdown — perfect for slow nights and launch weeks."],
          ["📍", "True neighborhood reach", "Your offer shows to people viewing your area — the radius is yours to set, up to 5 miles."],
          ["🤝", "Community, not coupons", "No race-to-the-bottom marketplace. Your offer, your terms, shown alongside your neighborhood's story."],
        ].map(([ic, h, b]) => (
          <div key={h} className="rounded-xl border border-line bg-white p-5">
            <div className="text-2xl">{ic}</div>
            <h3 className="mt-2 font-bold">{h}</h3>
            <p className="mt-1 text-sm text-ink-2">{b}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-line bg-white p-6">
        <h2 className="text-lg font-bold">Post your first offer</h2>
        <p className="mt-1 text-sm text-ink-3">
          Every offer is reviewed before it goes live. Offers run up to 7 days; housing,
          lending, and employment offers aren&apos;t permitted.
        </p>
        <BusinessOfferForm />
      </div>
    </main>
  );
}
