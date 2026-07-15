-- Projects table
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  raw_transcript text not null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  niche text,
  audience text,
  created_at timestamptz default now() not null
);

-- Posts table
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  hook text,
  post_type text check (post_type in ('story', 'educational', 'listicle', 'framework', 'case_study')),
  virality_score integer default 0,
  authority_score integer default 0,
  comment_potential integer default 0,
  readability_score integer default 0,
  image_prompt text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  scheduled_date timestamptz,
  created_at timestamptz default now() not null
);

-- RLS policies
alter table projects enable row level security;
alter table posts enable row level security;

create policy "Users can CRUD own projects" on projects for all using (auth.uid() = user_id);
create policy "Users can CRUD own posts" on posts for all using (auth.uid() = user_id);

create index if not exists idx_projects_user on projects (user_id, created_at desc);
create index if not exists idx_posts_project on posts (project_id);
create index if not exists idx_posts_user on posts (user_id, created_at desc);
