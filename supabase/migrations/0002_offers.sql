-- Local Offers: merchant-to-neighborhood offers.
-- Product rules enforced at the schema level where possible:
--   * every offer expires (<= 7 days out)
--   * category allowlist excludes housing/lending/employment entirely
--   * offers publish only after moderation (status flow)

create type offer_category as enum
  ('food', 'drink', 'coffee', 'retail', 'fitness', 'services', 'other');

create type offer_status as enum ('pending', 'approved', 'rejected', 'expired', 'withdrawn');

create table merchants (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(business_name) between 2 and 80),
  contact_email text not null,
  category offer_category not null,
  location geometry(Point, 4326) not null,
  address text not null,
  -- v1: honor-system identity; verification workflow comes with the moderation dashboard
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index merchants_location_gix on merchants using gist (location);

create table offers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 90),
  details text check (char_length(details) <= 280),
  category offer_category not null,
  discount_label text not null check (char_length(discount_label) between 2 and 40),
  redemption_code text,
  location geometry(Point, 4326) not null,
  radius_miles numeric not null check (radius_miles > 0 and radius_miles <= 5),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (expires_at > starts_at),
  check (expires_at <= starts_at + interval '7 days')
);

create index offers_location_gix on offers using gist (location);
create index offers_active_ix on offers (status, expires_at);

create table offer_claims (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  -- anonymous claim counting in v1; user_id joins in once Supabase auth ships
  user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz not null default now()
);

-- RLS: public can read approved+unexpired offers only; writes go through the
-- service role (API route) so validation and moderation can't be bypassed.
alter table offers enable row level security;
create policy "public read live offers" on offers
  for select using (status = 'approved' and expires_at > now());

alter table merchants enable row level security;
create policy "public read merchant names" on merchants for select using (true);

alter table offer_claims enable row level security;
create policy "own claims" on offer_claims
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
