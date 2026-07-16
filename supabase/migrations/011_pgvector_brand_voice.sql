-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Brand voice memories table
create table if not exists brand_voice_memories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null,
  content_text text not null,
  embedding vector(1536) not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- HNSW index for cosine distance search
create index if not exists idx_brand_voice_embedding
  on brand_voice_memories
  using hnsw (embedding vector_cosine_ops);

-- Index for filtering by user
create index if not exists idx_brand_voice_user
  on brand_voice_memories (user_id, created_at desc);

-- RLS
alter table brand_voice_memories enable row level security;

create policy "Users can CRUD own brand voice memories"
  on brand_voice_memories
  for all
  using (auth.uid() = user_id);

-- Match function
create or replace function match_brand_voice(
  query_embedding vector(1536),
  p_user_id uuid,
  p_match_count int default 5,
  p_content_type_filter text default null
)
returns table (
  id uuid,
  content_type text,
  content_text text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    bvm.id,
    bvm.content_type,
    bvm.content_text,
    bvm.metadata,
    bvm.created_at,
    1 - (bvm.embedding <=> query_embedding) as similarity
  from brand_voice_memories bvm
  where bvm.user_id = p_user_id
    and (p_content_type_filter is null or bvm.content_type = p_content_type_filter)
  order by bvm.embedding <=> query_embedding
  limit p_match_count;
$$;
