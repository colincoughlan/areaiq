# Spec: Neighborhood Pulse — live venue busyness + check-ins

## The idea, and why it pairs with Offers

Guests deciding where to go tonight see each participating venue's live vibe —
Quiet / Steady / Lively / Packed — before leaving the house. Merchants see their own
status and, when it's quiet, push an offer in one tap. Offers generate demand;
Pulse informs it. The pairing closes a loop competitors don't have: an offer shown
next to a visibly quiet room is credible, and a "Lively" badge is organic marketing.

## Cold start (the make-or-break)

Guest check-ins alone can't bootstrap — an empty pulse map convinces users the
feature (and the neighborhood) is dead. Order of operations:

1. **Merchant-reported status** seeds the map (they toggle Quiet/Steady/Packed; strong
   incentive to report Quiet + attach an offer).
2. **Guest check-ins corroborate** and freshen. A check-in is also how a guest claims
   an offer's redemption code — each loop feeds the other.
3. **History compounds** into per-venue busyness patterns ("Tuesdays are quiet until
   8") — proprietary local data that later powers "best time to go" and merchant
   analytics. This is where the moat deepens.

## Busyness model

- Signals: merchant status reports (weight 3) and guest check-ins (weight 1 each).
- Exponential decay, 90-minute half-life — the room an hour ago isn't the room now.
- Score → level: <1 quiet, <3 steady, <6 lively, else packed. If the freshest signal
  is older than 3 hours → **unknown** (gray). Stale data must fade, never lie.
- Display always carries freshness: "as of 12 min ago."

## Vibe, not judgment

Never green-good/red-bad: plenty of users WANT packed. Neutral palette
(quiet=slate, steady=teal, lively=amber, packed=coral) and both filters make sense
("find me a quiet table" / "where's the energy"). Copy never says good/bad/safe.

## Trust & privacy

- Check-ins are anonymous and aggregate. The product NEVER shows who is where —
  no social graph, no "3 friends here," no per-person location history stored.
- Rate limits: one check-in per client per venue per 2 hours; per-IP caps.
- v1 honor system; the native/PWA app can later add coarse geo-verification
  (was the device within ~200m?) before counting a check-in at full weight.
- Venue-scoped only. Busyness is never aggregated into neighborhood-level
  characterizations — that's a steering-risk surface this product will not touch.
- Merchant status reports are timestamped and public ("reported by the venue").

## v1 scope (this build)

- Schema: `venue_status_reports`, `check_ins` (0003_pulse.sql) with RLS.
- Busyness engine (pure, tested): decayed score, level mapping, freshness.
- `GET /api/pulse?areaId=` — participating venues + level + freshness + linked offer.
- `POST /api/pulse` — check-in {venueId, vibe?} with rate limiting.
- Area pages get a "Tonight's pulse" section; demo mode ships time-of-day-aware
  fictional venues (aligned with the demo offers so the story connects).
- Merchant status toggle ships with the merchant dashboard (next slice, with
  Supabase auth) — demo mode simulates it.

## Later

- Web push: "It's Friday 7pm — 3 venues near you are Lively, 1 has an offer."
- Busyness history charts per venue; "usually quiet now" from accumulated data.
- Check-in streaks/regular status (light, no leaderboards — community, not points).

## Acceptance tests

- Decay: a 90-min-old signal counts half; 3h+ stale → unknown regardless of score.
- Weighting: 1 merchant report ≈ 3 guest check-ins.
- Level thresholds and freshness labels.
- Rate limit: second check-in from same client+venue within 2h rejected.
- Demo venues vary plausibly with hour of day and align with demo offers.
