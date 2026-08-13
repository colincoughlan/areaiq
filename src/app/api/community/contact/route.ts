import { NextRequest, NextResponse } from "next/server";
import { validateContactRequest, type ContactRequestDraft } from "@/lib/community";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(SUPABASE_URL && SERVICE_KEY);

/**
 * Relays a contact request without ever returning the provider's contact
 * info to the client. In live mode this stores the request (server-side
 * only) — actually emailing the provider is a follow-up integration
 * (Supabase Edge Function + email provider), not built yet; noted honestly
 * in the response rather than implied.
 */
export async function POST(req: NextRequest) {
  let draft: ContactRequestDraft;
  try {
    draft = (await req.json()) as ContactRequestDraft;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const errors = validateContactRequest(draft);
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 });

  if (!configured) {
    return NextResponse.json(
      {
        accepted: false,
        beta: true,
        message:
          "The community directory is in closed beta — this listing is a demo, so no message was sent. Once the directory is live, requests are relayed to the provider without sharing your contact info with anyone else.",
      },
      { status: 503 }
    );
  }

  // Look up the provider server-side only (service role) to confirm it
  // exists and is approved — the client never sees contact_email.
  const providerRes = await fetch(
    `${SUPABASE_URL}/rest/v1/providers?id=eq.${encodeURIComponent(draft.providerId)}&status=eq.approved&select=id`,
    { headers: { apikey: SERVICE_KEY!, authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const found = providerRes.ok ? ((await providerRes.json()) as unknown[]) : [];
  if (found.length === 0) {
    return NextResponse.json({ error: "This listing is no longer available." }, { status: 404 });
  }

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/contact_requests`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY!,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      provider_id: draft.providerId,
      requester_name: draft.requesterName,
      requester_contact: draft.requesterContact,
      message: draft.message,
    }),
  });
  if (!insertRes.ok) {
    console.error("community/contact: insert failed", await insertRes.text());
    return NextResponse.json({ error: "Could not send your request." }, { status: 502 });
  }

  return NextResponse.json({
    accepted: true,
    // Honest about what actually happens: the request is stored server-side
    // now; automatically emailing the provider is a follow-up integration
    // (Supabase Edge Function + email provider) not built yet — don't claim
    // delivery that isn't implemented.
    message:
      "Request received and stored for the provider to follow up on your contact info. (Automatic email delivery to providers isn't wired up yet in this beta.) AreaIQ doesn't screen who responds.",
  });
}
