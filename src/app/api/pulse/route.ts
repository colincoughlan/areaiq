import { NextRequest, NextResponse } from "next/server";
import { getArea } from "@/lib/areas";
import { getRegion } from "@/lib/regions";
import { demoVenues } from "@/lib/demo-pulse";
import {
  canCheckIn,
  computePulse,
  freshnessLabel,
  LEVEL_META,
  type Vibe,
} from "@/lib/busyness";

export const dynamic = "force-dynamic";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Demo-mode ephemeral state: guest check-ins land in memory so testers see the
 * dot move during a session. Serverless instances lose this — acceptable for
 * demo; production uses Supabase.
 */
const demoCheckIns = new Map<string, { at: string; vibe?: Vibe }[]>();
const lastCheckInByClient = new Map<string, string>();

function clientKey(req: NextRequest, venueId: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${ip}|${venueId}`;
}

export async function GET(req: NextRequest) {
  const areaId = req.nextUrl.searchParams.get("areaId") ?? "";
  if (!getArea(areaId) && !getRegion(areaId)) {
    return NextResponse.json({ error: "Unknown area." }, { status: 404 });
  }

  if (configured) {
    // Production path: venues = merchants with recent signals (Supabase).
    // Ships with the merchant dashboard slice; until then live mode has no venues.
    return NextResponse.json({ mode: "live", venues: [] });
  }

  const now = new Date();
  const venues = demoVenues(now)
    .filter((v) => v.areaIds.includes(areaId))
    .map((v) => {
      const extra = demoCheckIns.get(v.id) ?? [];
      const signals = [
        ...v.signals,
        ...extra.map((e) => ({ kind: "guest" as const, at: e.at, vibe: e.vibe })),
      ];
      const pulse = computePulse(signals, now);
      return {
        id: v.id,
        name: v.name,
        category: v.category,
        address: v.address,
        offerId: v.offerId ?? null,
        level: pulse.level,
        levelLabel: LEVEL_META[pulse.level].label,
        color: LEVEL_META[pulse.level].color,
        freshness: freshnessLabel(pulse.freshnessMinutes),
        signalCount: pulse.signalCount,
        demo: true,
      };
    });

  return NextResponse.json({ mode: "demo", venues });
}

export async function POST(req: NextRequest) {
  let body: { venueId?: string; vibe?: Vibe };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const venueId = body.venueId ?? "";
  if (!venueId) return NextResponse.json({ error: "venueId is required." }, { status: 400 });
  if (body.vibe && !["quiet", "steady", "lively", "packed"].includes(body.vibe)) {
    return NextResponse.json({ error: "Invalid vibe." }, { status: 400 });
  }

  const key = clientKey(req, venueId);
  if (!canCheckIn(lastCheckInByClient.get(key) ?? null)) {
    return NextResponse.json(
      { error: "You've already checked in here recently — once per 2 hours." },
      { status: 429 }
    );
  }

  if (configured) {
    // Production insert lands with the merchant dashboard slice.
    return NextResponse.json(
      { accepted: false, beta: true, message: "Check-ins go live with merchant onboarding." },
      { status: 503 }
    );
  }

  const known = demoVenues().some((v) => v.id === venueId);
  if (!known) return NextResponse.json({ error: "Unknown venue." }, { status: 404 });

  const now = new Date().toISOString();
  lastCheckInByClient.set(key, now);
  const list = demoCheckIns.get(venueId) ?? [];
  list.push({ at: now, vibe: body.vibe });
  demoCheckIns.set(venueId, list.slice(-50));

  return NextResponse.json({ accepted: true, message: "Checked in — thanks for the signal!" });
}
