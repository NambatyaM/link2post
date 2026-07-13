-- Scripts table: stores generated short video scripts
create table if not exists scripts (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  video_id    uuid references videos(id) on delete cascade,
  script_json jsonb not null,
  created_at  timestamptz default now() not null
);

create index if not exists idx_scripts_user
  on scripts (user_id, created_at desc);

alter table scripts enable row level security;

create policy "Users can insert own scripts"
  on scripts for insert
  with check (auth.uid() = user_id);

create policy "Users can read own scripts"
  on scripts for select
  using (auth.uid() = user_id);

create policy "Users can delete own scripts"
  on scripts for delete
  using (auth.uid() = user_id);
