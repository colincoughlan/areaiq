-- Neighborhood Pulse: venue busyness signals.
-- Privacy rules at the schema level: check-ins carry NO user identity by default
-- (anonymous client hash for rate limiting only), and nothing here links a person
-- to a place over time.

create type busyness_vibe as enum ('quiet', 'steady', 'lively', 'packed');

-- Merchant-reported status (weight 3 in scoring). Public: "reported by the venue".
create table venue_status_reports (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  vibe busyness_vibe not null,
  reported_at timestamptz not null default now()
);

create index venue_status_reports_recent_ix on venue_status_reports (merchant_id, reported_at desc);

-- Guest check-ins (weight 1). Anonymous: client_hash is a salted hash used only
-- for rate limiting; it is never joined to auth.users and rotates with the salt.
create table check_ins (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  vibe busyness_vibe, -- optional guest impression
  client_hash text not null,
  created_at timestamptz not null default now()
);

create index check_ins_recent_ix on check_ins (merchant_id, created_at desc);
create index check_ins_ratelimit_ix on check_ins (client_hash, merchant_id, created_at desc);

-- Retention: signals older than 14 days have no product value and get purged.
-- (Set up a scheduled job: delete from check_ins where created_at < now() - interval '14 days')

alter table venue_status_reports enable row level security;
create policy "public read venue status" on venue_status_reports for select using (true);

alter table check_ins enable row level security;
-- Aggregate counts only via API (service role); no public row-level reads.
