import { notFound } from "next/navigation";
import { AREA_ORDER, getArea } from "@/lib/areas";
import { MapView } from "@/components/MapView";
import { SummaryCard } from "@/components/SummaryCard";

export function generateStaticParams() {
  return AREA_ORDER.map((id) => ({ id }));
}

export default function ExplorePage({ params }: { params: { id: string } }) {
  const area = getArea(params.id);
  if (!area) notFound();

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
