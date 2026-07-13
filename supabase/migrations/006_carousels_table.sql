-- Carousels table: stores generated carousel slides
create table if not exists carousels (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  video_id    uuid references videos(id) on delete cascade,
  slides_json jsonb not null,
  created_at  timestamptz default now() not null
);

create index if not exists idx_carousels_user
  on carousels (user_id, created_at desc);

alter table carousels enable row level security;

create policy "Users can insert own carousels"
  on carousels for insert
  with check (auth.uid() = user_id);

create policy "Users can read own carousels"
  on carousels for select
  using (auth.uid() = user_id);

create policy "Users can delete own carousels"
  on carousels for delete
  using (auth.uid() = user_id);
