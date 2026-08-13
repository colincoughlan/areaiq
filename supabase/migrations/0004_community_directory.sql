-- Community services directory: babysitters, dog walkers, handymen, and
-- other individual household help. Trust & safety rules enforced at the
-- schema level where possible (full plan in docs/specs/community-directory.md,
-- CLAUDE.md rule 5c):
--   * provider contact info is NEVER exposed via any public read path —
--     RLS blocks direct table reads entirely; a view exposes only the safe
--     public columns; contact happens through a mediated request only
--   * listings publish only after moderation (pending -> approved), same
--     flow as offers
--   * no ratings/reviews table in v1 (defamation/fake-review risk, deferred)
--   * no payment/booking fields — AreaIQ is a directory, not an escrow platform
--   * no identity/background-check verification of any kind in v1

create type service_category as enum ('babysitting', 'pet-care', 'handyman', 'other');
create type provider_status as enum ('pending', 'approved', 'rejected', 'suspended');

create table providers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 40),
  -- private: excluded from public_providers below and from every public API response
  contact_email text not null,
  categories service_category[] not null check (array_length(categories, 1) > 0),
  -- AreaIQ area/region id (pilot or coverage-tier) — the provider's declared
  -- service area. Deliberately not a precise geocoded home address.
  area_id text not null,
  bio text not null check (char_length(bio) between 10 and 400),
  -- self-reported, never independently verified — always labeled as such in the UI
  experience_note text check (char_length(experience_note) <= 200),
  -- self-reported, informational only, never a binding quote
  rate_note text check (char_length(rate_note) <= 60),
  status provider_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index providers_area_ix on providers (area_id, status);

create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  requester_name text not null check (char_length(requester_name) between 2 and 60),
  -- email or phone; used only server-side to relay one intro message
  requester_contact text not null,
  message text not null check (char_length(message) between 5 and 500),
  created_at timestamptz not null default now()
);

-- RLS: block ALL direct public reads of both tables. The API route uses the
-- service-role key (bypasses RLS) and is written to only ever forward the
-- safe public_providers columns to clients — this view is a second layer of
-- defense so a bug in application code can't leak contact_email.
alter table providers enable row level security;
create policy "no direct public reads of providers" on providers
  for select using (false);

create view public_providers as
  select id, display_name, categories, area_id, bio, experience_note, rate_note, created_at
  from providers
  where status = 'approved';

alter table contact_requests enable row level security;
create policy "no public reads of contact requests" on contact_requests
  for select using (false);
