-- AreaIQ initial schema (Phase 2 target — not yet wired to the app).
-- Postgres + PostGIS on Supabase. Forward-only migrations.
-- Sourcing rule: every fact-bearing table carries source, dates, and confidence.

create extension if not exists postgis;

-- ---------- reference geography ----------

create table neighborhoods (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  county text not null,
  boundary geometry(MultiPolygon, 4326),
  centroid geometry(Point, 4326),
  created_at timestamptz not null default now()
);

create index neighborhoods_boundary_gix on neighborhoods using gist (boundary);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  full_address text not null,
  location geometry(Point, 4326) not null,
  neighborhood_id uuid references neighborhoods(id),
  created_at timestamptz not null default now()
);

create index addresses_location_gix on addresses using gist (location);

-- ---------- sourcing (applies to all fact tables) ----------

create type source_kind as enum (
  'official-record', 'government-dataset', 'licensed-data',
  'local-news', 'ai-interpretation', 'sample-data'
);

create type confidence_level as enum ('high', 'medium', 'limited');

create table source_documents (
  id uuid primary key default gen_random_uuid(),
  kind source_kind not null,
  name text not null,
  url text,
  document_ref text,
  published_at date,
  effective_at date,
  retrieved_at date not null,
  license_note text,
  created_at timestamptz not null default now()
);

-- ---------- metrics ----------

create table housing_metrics (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id),
  metric text not null,               -- e.g. 'owner_occupied_pct'
  value_numeric numeric,
  value_text text,
  margin_of_error numeric,            -- drives confidence for ACS tract data
  period text not null,               -- e.g. 'ACS 2020-2024'
  source_id uuid not null references source_documents(id),
  confidence confidence_level not null,
  created_at timestamptz not null default now(),
  unique (neighborhood_id, metric, period)
);

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text not null,
  location geometry(Point, 4326),
  enrollment integer,
  notes text,
  source_id uuid references source_documents(id),
  retrieved_at date,
  created_at timestamptz not null default now()
);

create index schools_location_gix on schools using gist (location);

create table amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,             -- grocery, park, pharmacy, transit, ...
  location geometry(Point, 4326) not null,
  source_id uuid references source_documents(id),
  retrieved_at date,
  created_at timestamptz not null default now()
);

create index amenities_location_gix on amenities using gist (location);
create index amenities_category_ix on amenities (category);

create type project_status as enum ('proposed', 'approved', 'under-construction', 'completed');

create table development_projects (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid references neighborhoods(id),
  name text not null,
  project_type text not null,
  status project_status not null,
  size_description text,
  filed_at date,
  approved_at date,
  expected_completion text,
  agency text,
  location geometry(Point, 4326),
  source_id uuid not null references source_documents(id),
  confidence confidence_level not null default 'medium',
  -- AI-generated; must be labeled as interpretation in UI, never fact
  possible_effects_ai text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index development_projects_location_gix on development_projects using gist (location);

create table environmental_risks (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id),
  risk_type text not null,            -- fire, flood, air, heat, noise, quake
  designation text not null,          -- e.g. 'CAL FIRE Very High FHSZ (partial)'
  source_id uuid not null references source_documents(id),
  effective_at date,
  retrieved_at date not null,
  created_at timestamptz not null default now()
);

-- ---------- computed presentation ----------

create table area_scores (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id),
  score_version text not null,        -- versioned methodology, auditable
  daily_life smallint not null check (daily_life between 0 and 100),
  housing smallint not null check (housing between 0 and 100),
  future_score smallint not null check (future_score between 0 and 100),
  confidence confidence_level not null,
  -- Product rule: no composite score column. Component scores only.
  computed_at timestamptz not null default now(),
  unique (neighborhood_id, score_version)
);

create table ai_summaries (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id),
  section text not null,              -- 'narrative' | 'changing' | ...
  content text not null,
  prompt_version text not null,
  data_version text not null,         -- cache key: regenerate only when inputs change
  cited_source_ids uuid[] not null,   -- citation enforcement: empty array is invalid
  created_at timestamptz not null default now(),
  check (cardinality(cited_source_ids) > 0)
);

-- ---------- users (Phase 2) ----------

create table saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  neighborhood_id uuid not null references neighborhoods(id),
  created_at timestamptz not null default now(),
  unique (user_id, neighborhood_id)
);

alter table saved_locations enable row level security;

create policy "own saved locations" on saved_locations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read on reference data (no PII in these tables)
alter table neighborhoods enable row level security;
create policy "public read neighborhoods" on neighborhoods for select using (true);
alter table development_projects enable row level security;
create policy "public read projects" on development_projects for select using (true);
alter table area_scores enable row level security;
create policy "public read scores" on area_scores for select using (true);
