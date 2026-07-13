-- MVP Calendar tables

-- Videos: stores each processed YouTube video
create table if not exists videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text,
  video_id text,
  transcript text,
  created_at timestamptz default now() not null
);

create index if not exists idx_videos_user_created
  on videos (user_id, created_at desc);

alter table videos enable row level security;

create policy "Users can insert own videos"
  on videos for insert
  with check (auth.uid() = user_id);

create policy "Users can read own videos"
  on videos for select
  using (auth.uid() = user_id);

create policy "Users can delete own videos"
  on videos for delete
  using (auth.uid() = user_id);

-- Calendar items: each individual post or article
create table if not exists calendar_items (
  id uuid default gen_random_uuid() primary key,
  video_id uuid not null references videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('post', 'article')),
  day text not null,
  recommended_time text,
  title text,
  body text not null,
  hook text,
  image_prompt text,
  image_prompts jsonb,
  content_index integer,
  feedback text check (feedback in ('up', 'down')),
  feedback_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_calendar_items_video
  on calendar_items (video_id);

create index if not exists idx_calendar_items_user
  on calendar_items (user_id, created_at desc);

alter table calendar_items enable row level security;

create policy "Users can insert own calendar items"
  on calendar_items for insert
  with check (auth.uid() = user_id);

create policy "Users can read own calendar items"
  on calendar_items for select
  using (auth.uid() = user_id);

create policy "Users can update own calendar items"
  on calendar_items for update
  using (auth.uid() = user_id);

-- Copy events: silent tracking of copy-button clicks
create table if not exists copy_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  calendar_item_id uuid not null references calendar_items(id) on delete cascade,
  copied_field text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_copy_events_item
  on copy_events (calendar_item_id);

alter table copy_events enable row level security;

create policy "Users can insert own copy events"
  on copy_events for insert
  with check (auth.uid() = user_id);

-- Generation events: one row per calendar generation for return-rate tracking
create table if not exists generation_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_url text not null,
  calendar_week text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_generation_events_user
  on generation_events (user_id, created_at desc);

alter table generation_events enable row level security;

create policy "Users can insert own generation events"
  on generation_events for insert
  with check (auth.uid() = user_id);

create policy "Users can read own generation events"
  on generation_events for select
  using (auth.uid() = user_id);
