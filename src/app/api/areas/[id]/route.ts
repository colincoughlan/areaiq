import { NextResponse } from "next/server";
import { AREA_ORDER } from "@/lib/areas";
import { getAreaPayload } from "@/lib/api-payload";
import { buildRegionSnapshot, listRegions } from "@/lib/regions";

export const dynamic = "force-static";

export function generateStaticParams() {
  const pilotIds = new Set<string>(AREA_ORDER);
  return [
    ...AREA_ORDER.map((id) => ({ id })),
    ...listRegions()
      .filter((r) => !pilotIds.has(r.id))
      .map((r) => ({ id: r.id })),
  ];
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const payload = getAreaPayload(params.id);
  if (payload) return NextResponse.json({ tier: "pilot", ...payload });

  const snapshot = buildRegionSnapshot(params.id);
  if (snapshot) return NextResponse.json(snapshot);

  return NextResponse.json({ error: "Unknown area." }, { status: 404 });
}
