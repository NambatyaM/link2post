-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- Rate limits table (authenticated users)
create table if not exists rate_limits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null
);

create index if not exists idx_rate_limits_user_created
  on rate_limits (user_id, created_at);

alter table rate_limits enable row level security;

create policy "Insert own rate limits"
  on rate_limits for insert
  with check (auth.uid() = user_id);

create policy "Read own rate limits"
  on rate_limits for select
  using (auth.uid() = user_id);

-- Generations table (tracks ALL generations: anonymous + authenticated)
create table if not exists generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  device_id text,
  fingerprint text,
  created_at timestamptz default now() not null
);

create index if not exists idx_generations_device_created
  on generations (device_id, created_at);

create index if not exists idx_generations_user_created
  on generations (user_id, created_at);

alter table generations enable row level security;

-- Anyone can insert (for anonymous tracking)
create policy "Anyone can insert generations"
  on generations for insert
  with check (true);

-- Users can read their own generations
create policy "Users can read own generations"
  on generations for select
  using (
    auth.uid() = user_id
    or device_id = current_setting('request.headers', true)::jsonb->>'x-device-id'
  );

-- Saved outputs table
create table if not exists saved_outputs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  content text not null,
  source_content text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_saved_outputs_user_created
  on saved_outputs (user_id, created_at desc);

alter table saved_outputs enable row level security;

create policy "Users can insert own outputs"
  on saved_outputs for insert
  with check (auth.uid() = user_id);

create policy "Users can read own outputs"
  on saved_outputs for select
  using (auth.uid() = user_id);

create policy "Users can update own outputs"
  on saved_outputs for update
  using (auth.uid() = user_id);

create policy "Users can delete own outputs"
  on saved_outputs for delete
  using (auth.uid() = user_id);

-- Auto-cleanup function for rate limits (older than 24h)
create or replace function cleanup_rate_limits()
returns void as $$
  delete from rate_limits where created_at < now() - interval '24 hours';
$$ language sql;

-- Cleanup old anonymous generations (older than 7 days)
create or replace function cleanup_anonymous_generations()
returns void as $$
  delete from generations where user_id is null and created_at < now() - interval '7 days';
$$ language sql;
