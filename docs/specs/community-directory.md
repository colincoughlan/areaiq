# Spec: Community services directory (babysitters, dog walkers, handymen)

## Origin

Verbatim from the user's original feature request that shaped this whole
build phase: "build a community for babysitters, dog walkers, handymen."
Deliberately sequenced last, per the user's own instruction ("ok lets build
that last"), because it needed a trust & safety plan before scoping further
— this doc is that plan, followed by the build.

## Why this is riskier than Local Offers

Local Offers connects people to public businesses at a public address for a
one-time discounted purchase. This feature connects people to an individual,
often inviting that person into their home, sometimes alone with children or
pets. The failure modes are personal-safety failure modes, not just a bad
transaction. The plan below exists specifically to not overclaim safety
AreaIQ can't actually provide.

## Trust & safety decisions (the plan the feature was waiting on)

1. **No identity or background-check verification, and we say so loudly.**
   AreaIQ does not run background checks, verify licenses, or confirm
   identity in v1. Every listing and every point of contact says this
   explicitly — "self-reported, not independently verified by AreaIQ" — the
   same honesty standard the rest of the product applies to data sources,
   applied here to people instead of statistics.
2. **Contact is mediated, never public.** A provider's email is never
   returned by any public API response or rendered in any client component —
   enforced at the database layer via a Postgres view (`public_providers`)
   that excludes `contact_email`, plus RLS blocking direct table reads
   entirely, not just convention in application code (defense in depth: a
   bug in the API route can't leak it). Visitors send a contact request
   (their own name/contact/message); the provider's real email is looked up
   only server-side, only for the purpose of forwarding that one message.
   Neither party gets the other's contact info until they choose to share it
   themselves in that exchange.
3. **Moderation gate before anything is public** — identical `pending →
   approved` flow to Local Offers, same reasoning: validation is an
   automated pre-filter, moderation review is the actual gate.
4. **No ratings or reviews in v1.** Fake reviews and defamation risk are
   real for a directory about individual people (more so than businesses) —
   explicitly deferred, not silently missing. A future version would need
   its own plan (verified-transaction-only reviews, dispute process) before
   shipping.
5. **No payments or booking.** AreaIQ is a directory, not an escrow or
   scheduling platform — arranging payment/schedule is between the two
   people, so AreaIQ never implies it holds funds or guarantees a booking.
6. **Category allowlist only**: babysitting/childcare, pet care/dog walking,
   handyman/home repair, other household help. Nothing requiring a license
   AreaIQ can't verify (no medical, legal, financial, or contractor-license-
   required trades).
7. **Keyword content screen on bios**, same pattern as the offers banned-term
   filter (`validateOfferDraft`) — a best-effort automated pre-filter for
   discriminatory refusal-of-service language, not a substitute for
   moderation review, which remains the real gate.

## Data model

`supabase/migrations/0004_community_directory.sql` — `providers` table (RLS
blocks all direct public reads; a `public_providers` view exposes only the
safe public columns), `contact_requests` table (also fully RLS-blocked from
public reads — relay happens server-side via the service-role API route
only).

## Demo mode

Same pattern as Local Offers/Neighborhood Pulse: without Supabase configured,
the directory shows clearly labeled fictional listings (`demo: true`) so the
feature is testable; POST requests return a "beta, not yet connected"
message instead of silently failing. Nothing here works without deliberate
opt-in once real people's contact info is involved — there's no world where
demo listings could be mistaken for real people.

## UI

- `CommunityDirectory` — browse section on pilot + coverage-tier area pages
  (added to both persona-lens orderings as `community`), grouped by category,
  every card carries the "self-reported, not independently verified" note
  and a "Request intro" action instead of any visible contact info.
- `/community` — landing page + `ProviderListingForm` for providers to list
  their service (mirrors `/business` + `BusinessOfferForm`).
- Contact request is a small inline form on each listing card; on submit it
  hits `/api/community/contact`, which never returns the provider's contact
  info to the client, live or demo mode.

## Explicitly out of scope for v1 (future work, needs its own plan)

Ratings/reviews, identity verification / background checks, in-app
messaging (v1 relays one message via email, that's it), payments, provider
availability/calendar.
