import { ProviderListingForm } from "@/components/ProviderListingForm";

export const metadata = { title: "AreaIQ Community Services" };

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Babysitters, dog walkers, handymen —<br />
        posted by your neighbors, not an app.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-ink-2">
        List your services for the areas you cover. AreaIQ reviews every listing before it goes
        live, but does not run background checks or verify identity — the same honesty standard
        the rest of the product applies to data, applied here to people.
      </p>

      <div className="mt-8 rounded-xl border border-line bg-canvas p-5 text-sm text-ink-2">
        <p className="font-semibold text-ink">How contact works</p>
        <p className="mt-1">
          Your email is never shown publicly. Interested neighbors send a request through
          AreaIQ with their own contact info; you decide whether to respond. AreaIQ doesn&apos;t
          process payments or bookings — that&apos;s between you and the neighbor.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-white p-6">
        <h2 className="text-lg font-bold">List your service</h2>
        <p className="mt-1 text-sm text-ink-3">
          Every listing is reviewed before it goes live.
        </p>
        <ProviderListingForm />
      </div>
    </main>
  );
}
