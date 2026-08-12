import { redirect } from "next/navigation";
import { AREA_ORDER } from "@/lib/areas";
import { listRegions } from "@/lib/regions";
import { matchAreaFromShare } from "@/lib/share-target";
import { SearchBar } from "@/components/SearchBar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shared listing — AreaIQ" };

/**
 * Android Web Share Target landing page (see manifest.webmanifest
 * "share_target" and docs/specs/share-target.md). Someone shares a Zillow/
 * Redfin/Realtor.com listing into the installed app; we best-effort match
 * the embedded city name against known areas and go straight to that
 * report. iOS has no equivalent yet — Safari doesn't support Web Share
 * Target, that needs the Capacitor wrapper.
 */
export default function SharePage({
  searchParams,
}: {
  searchParams: { title?: string; text?: string; url?: string };
}) {
  const pilotIds = new Set<string>(AREA_ORDER);
  const candidateIds = [...AREA_ORDER, ...listRegions().map((r) => r.id).filter((id) => !pilotIds.has(id))];

  const match = matchAreaFromShare(searchParams, candidateIds);
  if (match) redirect(`/area/${match}`);

  const shared = [searchParams.title, searchParams.text, searchParams.url].filter(Boolean).join(" — ");

  return (
    <main className="mx-auto max-w-xl px-4 pb-20 pt-12 text-center">
      <h1 className="text-2xl font-bold">We got your shared listing</h1>
      <p className="mt-2 text-sm text-ink-2">
        {shared
          ? "We couldn't automatically match a city from it yet — search below instead."
          : "Search for the city or community from your listing below."}
      </p>
      <div className="mt-6">
        <SearchBar />
      </div>
      {shared && (
        <p className="mt-8 break-words rounded-lg bg-canvas p-3 text-left text-xs text-ink-3">
          Shared content: {shared}
        </p>
      )}
    </main>
  );
}
