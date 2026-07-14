-- Analytics tables for tracking signups, generations, and return visits

-- Signup events: one row per new user registration
create table if not exists signup_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text default 'direct', -- 'direct', 'referral', 'signup_wall'
  referrer_code text,           -- referral code used if any
  device_id text,               -- device fingerprint if available
  created_at timestamptz default now() not null
);

create index if not exists idx_signup_events_created
  on signup_events (created_at desc);

create index if not exists idx_signup_events_source
  on signup_events (source);

alter table signup_events enable row level security;

-- Only service role can insert (server-side only)
create policy "Service role can insert signup events"
  on signup_events for insert
  with check (true);

-- Only service role can read (admin analytics)
create policy "Service role can read signup events"
  on signup_events for select
  using (true);

-- Visit events: one row per page load / session start
create table if not exists visit_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  device_id text,
  fingerprint text,
  path text default '/',
  is_return boolean default false,  -- true if this device/user visited before
  session_id text,                   -- client-generated session ID
  created_at timestamptz default now() not null
);

create index if not exists idx_visit_events_created
  on visit_events (created_at desc);

create index if not exists idx_visit_events_device
  on visit_events (device_id, created_at desc);

create index if not exists idx_visit_events_user
  on visit_events (user_id, created_at desc);

alter table visit_events enable row level security;

-- Anyone can insert (anonymous tracking)
create policy "Anyone can insert visit events"
  on visit_events for insert
  with check (true);

-- Only service role can read (admin analytics)
create policy "Service role can read visit events"
  on visit_events for select
  using (true);

-- Enhanced generation events: detailed tracking of every generation attempt
create table if not exists generation_analytics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  device_id text,
  generation_type text not null,  -- 'calendar', 'script', 'carousel', 'regenerate'
  provider_id text,               -- which AI provider was used
  model_id text,                  -- which model was used
  success boolean default true,   -- did generation succeed?
  error_message text,             -- if failed, what error
  duration_ms integer,            -- how long it took
  created_at timestamptz default now() not null
);

create index if not exists idx_generation_analytics_created
  on generation_analytics (created_at desc);

create index if not exists idx_generation_analytics_type
  on generation_analytics (generation_type, created_at desc);

create index if not exists idx_generation_analytics_user
  on generation_analytics (user_id, created_at desc);

alter table generation_analytics enable row level security;

-- Anyone can insert (anonymous tracking)
create policy "Anyone can insert generation analytics"
  on generation_analytics for insert
  with check (true);

-- Only service role can read (admin analytics)
create policy "Service role can read generation analytics"
  on generation_analytics for select
  using (true);

-- Cleanup function: remove visit events older than 90 days
create or replace function cleanup_visit_events()
returns void as $$
  delete from visit_events where created_at < now() - interval '90 days';
$$ language sql;

-- Cleanup function: remove generation analytics older than 90 days
create or replace function cleanup_generation_analytics()
returns void as $$
  delete from generation_analytics where created_at < now() - interval '90 days';
$$ language sql;
