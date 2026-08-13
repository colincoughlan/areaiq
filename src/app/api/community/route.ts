import { NextRequest, NextResponse } from "next/server";
import { getArea } from "@/lib/areas";
import { getRegion } from "@/lib/regions";
import { demoProviders } from "@/lib/demo-community";
import {
  providersForArea,
  validateProviderDraft,
  type ProviderDraft,
  type ProviderListing,
  type ServiceCategory,
} from "@/lib/community";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(SUPABASE_URL && SERVICE_KEY);

function areaExists(areaId: string): boolean {
  return Boolean(getArea(areaId) ?? getRegion(areaId));
}

/** Reads ONLY the public_providers view — never the base providers table —
 * so contact_email can never leak here even if this code has a bug. */
async function supabaseSelectProviders(areaId: string): Promise<ProviderListing[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/public_providers?select=id,display_name,categories,area_id,bio,experience_note,rate_note` +
    `&area_id=eq.${encodeURIComponent(areaId)}`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY!, authorization: `Bearer ${SERVICE_KEY}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    displayName: String(r.display_name),
    categories: r.categories as ServiceCategory[],
    areaId: String(r.area_id),
    bio: String(r.bio),
    experienceNote: (r.experience_note as string) ?? undefined,
    rateNote: (r.rate_note as string) ?? undefined,
  }));
}

export async function GET(req: NextRequest) {
  const areaId = req.nextUrl.searchParams.get("areaId") ?? "";
  if (!areaExists(areaId)) return NextResponse.json({ error: "Unknown area." }, { status: 404 });

  let source: ProviderListing[];
  let mode: "live" | "demo";
  if (configured) {
    try {
      source = await supabaseSelectProviders(areaId);
      mode = "live";
    } catch (e) {
      console.error("community: supabase read failed", e);
      return NextResponse.json({ error: "The directory is unavailable right now." }, { status: 502 });
    }
  } else {
    source = providersForArea(demoProviders(), areaId);
    mode = "demo";
  }

  return NextResponse.json({ mode, providers: source });
}

export async function POST(req: NextRequest) {
  let draft: ProviderDraft;
  try {
    draft = (await req.json()) as ProviderDraft;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const errors = validateProviderDraft(draft);
  if (!areaExists(draft.areaId)) errors.push("Unknown service area.");
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 });

  if (!configured) {
    return NextResponse.json(
      {
        accepted: false,
        beta: true,
        message:
          "The community directory is in closed beta — your listing passed validation, but the database isn't connected yet. Email community@areaiq.example and we'll onboard you.",
      },
      { status: 503 }
    );
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/providers`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY!,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      display_name: draft.displayName,
      contact_email: draft.contactEmail,
      categories: draft.categories,
      area_id: draft.areaId,
      bio: draft.bio,
      experience_note: draft.experienceNote ?? null,
      rate_note: draft.rateNote ?? null,
      status: "pending",
    }),
  });
  if (!res.ok) {
    console.error("community: provider insert failed", await res.text());
    return NextResponse.json({ error: "Could not save your listing." }, { status: 502 });
  }

  return NextResponse.json({
    accepted: true,
    message: "Listing submitted — it goes live after a quick review.",
  });
}
