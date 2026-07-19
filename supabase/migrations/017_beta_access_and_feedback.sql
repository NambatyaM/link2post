-- Add beta_access flag to user_profiles
alter table user_profiles add column if not exists beta_access boolean default false;

-- Create beta_feedback table
create table if not exists beta_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  text text default '',
  created_at timestamptz default now()
);

alter table beta_feedback enable row level security;

create policy "Users can insert own feedback"
  on beta_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on beta_feedback for select
  using (auth.uid() = user_id);
