import { NextRequest, NextResponse } from "next/server";
import { getArea } from "@/lib/areas";
import { getRegion } from "@/lib/regions";
import { buildBusinessQuery, parseBusinessResults, type OverpassElement } from "@/lib/nearby-business";

// The main public Overpass instance is sometimes overloaded ("server too
// busy" 504s at peak times) — fall back to a mirror rather than fail outright.
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const RADIUS_METERS = 4828; // 3 miles — wider than the daily-life amenity radius on purpose
const MAX_TERM_LEN = 60;
const FETCH_TIMEOUT_MS = 12_000;

async function fetchOverpass(query: string): Promise<Response | null> {
  for (const url of OVERPASS_URLS) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "AreaIQ/0.1 (neighborhood-intelligence prototype)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (res.ok) return res;
      console.error(`Overpass ${url} returned ${res.status}`);
    } catch (err) {
      console.error(`Overpass ${url} failed:`, err);
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}

/** Naive in-memory rate limit, same pattern as /api/ask. */
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 10;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many searches — try again in a minute." }, { status: 429 });
  }

  const areaId = req.nextUrl.searchParams.get("areaId") ?? "";
  const term = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, MAX_TERM_LEN);
  if (!areaId || term.length < 2) {
    return NextResponse.json({ error: "areaId and a search term (q) are required." }, { status: 400 });
  }

  const area = getArea(areaId);
  const region = area ? null : getRegion(areaId);
  const center = area ?? region;
  if (!center) return NextResponse.json({ error: "Unknown area." }, { status: 404 });

  const { query, category } = buildBusinessQuery(term, center.lat, center.lng, RADIUS_METERS);

  const res = await fetchOverpass(query);
  if (!res) {
    return NextResponse.json(
      { error: "The business search is temporarily unavailable (OpenStreetMap's search service is busy) — try again shortly." },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { elements?: OverpassElement[] };
  const results = parseBusinessResults(data.elements ?? [], center, category);

  return NextResponse.json({
    term,
    category: category ? { key: category.key, label: category.label } : null,
    radiusMiles: RADIUS_METERS / 1609.34,
    results,
    source: "OpenStreetMap contributors (via Overpass API), live query",
    attribution: "© OpenStreetMap contributors, ODbL",
  });
}
