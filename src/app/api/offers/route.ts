import { NextRequest, NextResponse } from "next/server";
import { getArea } from "@/lib/areas";
import { getRegion } from "@/lib/regions";
import { demoOffers } from "@/lib/demo-offers";
import {
  offersForArea,
  validateOfferDraft,
  type Offer,
  type OfferDraft,
} from "@/lib/offers";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(SUPABASE_URL && SERVICE_KEY);

function areaCenter(areaId: string): { lat: number; lng: number; name: string } | null {
  const pilot = getArea(areaId);
  if (pilot) return { lat: pilot.lat, lng: pilot.lng, name: pilot.name };
  const region = getRegion(areaId);
  if (region) return { lat: region.lat, lng: region.lng, name: region.name };
  return null;
}

/** Minimal Supabase REST calls — avoids an SDK dependency for two queries. */
async function supabaseSelectOffers(): Promise<Offer[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/offers?select=id,title,details,category,discount_label,radius_miles,starts_at,expires_at,lat:location->coordinates->1,lng:location->coordinates->0,merchants(business_name,address)` +
    `&status=eq.approved&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY!, authorization: `Bearer ${SERVICE_KEY}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows.map((r) => {
    const m = r.merchants as { business_name?: string; address?: string } | null;
    return {
      id: String(r.id),
      businessName: m?.business_name ?? "Local business",
      title: String(r.title),
      details: (r.details as string) ?? undefined,
      category: r.category as Offer["category"],
      discountLabel: String(r.discount_label),
      address: m?.address ?? "",
      lat: Number(r.lat),
      lng: Number(r.lng),
      radiusMiles: Number(r.radius_miles),
      startsAt: String(r.starts_at),
      expiresAt: String(r.expires_at),
    };
  });
}

export async function GET(req: NextRequest) {
  const areaId = req.nextUrl.searchParams.get("areaId") ?? "";
  const center = areaCenter(areaId);
  if (!center) return NextResponse.json({ error: "Unknown area." }, { status: 404 });

  let source: Offer[];
  let mode: "live" | "demo";
  if (configured) {
    try {
      source = await supabaseSelectOffers();
      mode = "live";
    } catch (e) {
      console.error("offers: supabase read failed", e);
      return NextResponse.json({ error: "Offers are unavailable right now." }, { status: 502 });
    }
  } else {
    source = demoOffers();
    mode = "demo";
  }

  return NextResponse.json({
    mode,
    area: center.name,
    offers: offersForArea(source, center),
  });
}

export async function POST(req: NextRequest) {
  let draft: OfferDraft;
  try {
    draft = (await req.json()) as OfferDraft;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const errors = validateOfferDraft(draft);
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 });

  if (!configured) {
    return NextResponse.json(
      {
        accepted: false,
        beta: true,
        message:
          "Merchant offers are in closed beta — your submission passed validation, but the database isn't connected yet. Email offers@areaiq.example and we'll onboard you.",
      },
      { status: 503 }
    );
  }

  // Insert merchant + pending offer via PostgREST (service role bypasses RLS;
  // validation above is the gate, moderation approves before anything shows).
  const headers = {
    apikey: SERVICE_KEY!,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
    prefer: "return=representation",
  };
  const point = `SRID=4326;POINT(${draft.lng} ${draft.lat})`;

  const mRes = await fetch(`${SUPABASE_URL}/rest/v1/merchants`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      business_name: draft.businessName,
      contact_email: draft.contactEmail,
      category: draft.category,
      location: point,
      address: draft.address,
    }),
  });
  if (!mRes.ok) {
    console.error("offers: merchant insert failed", await mRes.text());
    return NextResponse.json({ error: "Could not save your business." }, { status: 502 });
  }
  const merchant = ((await mRes.json()) as { id: string }[])[0];

  const oRes = await fetch(`${SUPABASE_URL}/rest/v1/offers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      merchant_id: merchant.id,
      title: draft.title,
      details: draft.details ?? null,
      category: draft.category,
      discount_label: draft.discountLabel,
      location: point,
      radius_miles: draft.radiusMiles,
      expires_at: draft.expiresAt,
      status: "pending",
    }),
  });
  if (!oRes.ok) {
    console.error("offers: offer insert failed", await oRes.text());
    return NextResponse.json({ error: "Could not save your offer." }, { status: 502 });
  }

  return NextResponse.json({
    accepted: true,
    message: "Offer submitted — it goes live after a quick review.",
  });
}
