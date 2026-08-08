import { notFound } from "next/navigation";
import { AREA_ORDER, getArea } from "@/lib/areas";
import { MapView } from "@/components/MapView";
import { RegionMapView } from "@/components/RegionMapView";
import { SummaryCard } from "@/components/SummaryCard";
import { RegionExploreSummary } from "@/components/RegionExploreSummary";
import { buildRegionSnapshot, listRegions } from "@/lib/regions";

export function generateStaticParams() {
  const pilotIds = new Set<string>(AREA_ORDER);
  return [
    ...AREA_ORDER.map((id) => ({ id })),
    ...listRegions()
      .filter((r) => !pilotIds.has(r.id))
      .map((r) => ({ id: r.id })),
  ];
}

export default function ExplorePage({ params }: { params: { id: string } }) {
  const area = getArea(params.id);
  if (area) {
    return (
      <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 pt-6 lg:grid-cols-[1fr_420px]">
        <div className="min-h-[420px] overflow-hidden rounded-xl border border-line bg-white">
          <MapView area={area} />
        </div>
        <div>
          <SummaryCard area={area} />
        </div>
      </main>
    );
  }

  const snapshot = buildRegionSnapshot(params.id);
  if (!snapshot) notFound();

  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 pt-6 lg:grid-cols-[1fr_420px]">
      <div className="min-h-[420px] overflow-hidden rounded-xl border border-line bg-white">
        <RegionMapView
          name={snapshot.region.name}
          lat={snapshot.region.lat}
          lng={snapshot.region.lng}
          schools={snapshot.schools}
        />
      </div>
      <div>
        <RegionExploreSummary snapshot={snapshot} />
      </div>
    </main>
  );
}
