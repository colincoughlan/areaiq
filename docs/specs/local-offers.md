# Spec: Local Offers — merchant-to-neighborhood offers (the engagement moat)

## Product idea

Local businesses (restaurants, bars, coffee shops, single-location retail) push
geo-targeted, time-limited offers to residents of their area: "20% off if you come in
today," "Quiet Tuesday — 30% off tonight." Residents see live offers on their area's
page and (later) as push notifications. This converts AreaIQ from an episodic research
tool into a daily community utility, and merchants become the recurring-revenue side.

## Why it can be a moat (and what to watch)

- Recurring engagement + local density compound: the more residents in an area, the more
  merchants post, and vice versa. Classic two-sided flywheel — but that also means a
  **cold-start problem**. Seed strategy: launch in ONE pilot area (Highland Park has the
  strongest merchant density in our data — 111 food POIs), founder-does-sales to the
  first 10–20 merchants, offers are free for merchants during beta.
- Competitive: Groupon (discount marketplace, extractive economics merchants resent),
  Nextdoor (has local deals, weak product), Yelp (check-in offers). The wedge: instant,
  self-serve, time-boxed "right-now" offers with true neighborhood targeting and no
  upfront cost — plus AreaIQ's existing neighborhood content brings the audience.

## v1 scope (this build)

- Data model + Supabase migration (offers, merchants, claims) with RLS.
- `GET /api/offers?areaId=` — active offers within radius of the area center.
- `POST /api/offers` — create an offer (validation: expiry ≤ 7 days, radius ≤ 5 mi,
  discount text length caps, category allowlist).
- Area pages show a "Live local offers" section; `/business` page pitches merchants and
  hosts the create-offer form.
- **Demo mode**: without Supabase configured, GET serves seeded sample offers (clearly
  labeled "Demo"), POST returns a friendly "beta — email us" response. With
  `NEXT_PUBLIC_SUPABASE_URL` + keys set, reads/writes go to Postgres. Same code path
  for testers today and production tomorrow.

## Deliberately NOT in v1

- Push notifications — next slice: Web Push (works on installed PWAs incl. iOS 16.4+),
  VAPID keys, per-area subscription topics, quiet-hours rules (no pushes 9pm–8am),
  frequency caps (max 2/day per user). The service worker is already in place to extend.
- Merchant identity verification (v1 = email + honor system, every offer moderated
  before it goes live: `status='pending'` until approved in Supabase).
- Payments/redemption tracking — v1 offers carry a show-at-counter code; claims table
  exists for later analytics.

## Abuse, trust & legal guardrails

- All offers start `pending`; nothing publishes without approval (beta = you approve
  rows in Supabase; later a moderation dashboard).
- Category allowlist (food/drink/coffee/retail/fitness/services/other) — no housing,
  lending, or employment offers EVER (fair-housing/lending ad rules; also keeps the
  product's housing side clean of targeting concerns).
- Geo-targeting is by AREA, never by individual profile or demographic — offers are
  visible to anyone viewing the area. No discriminatory targeting is possible by design.
- Expiry is mandatory and short (≤ 7 days); expired offers disappear automatically.
- Content length caps + the same banned-language screen used elsewhere.
- Push (when added) is opt-in per area with one-tap unsubscribe.

## Business model note

Free during beta → then either per-push pricing, a flat monthly "local business" plan
(Realtor-Pro-style tier), or boosted placement. Decide after merchants demonstrate
repeat usage; don't price before the flywheel spins.

## Acceptance tests

- Validation rejects: past expiry, >7-day expiry, radius >5mi, empty title, bad category.
- Geo filter: offer 1 mi from area center included at 2 mi radius; 10 mi away excluded.
- Expired offers filtered from GET results.
- Demo seeds load and are labeled; POST without Supabase returns the beta message.
