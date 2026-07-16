-- Fix: Create projects and posts tables (idempotent)
-- These tables were missing from the remote database

CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  raw_transcript text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  niche text,
  audience text,
  goals text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  hook text,
  post_type text CHECK (post_type IN ('story', 'educational', 'listicle', 'framework', 'case_study')),
  virality_score integer DEFAULT 0,
  authority_score integer DEFAULT 0,
  comment_potential integer DEFAULT 0,
  readability_score integer DEFAULT 0,
  image_prompt text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  scheduled_date timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can CRUD own projects" ON projects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can CRUD own posts" ON posts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can CRUD own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own posts" ON posts FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_project ON posts (project_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts (user_id, created_at DESC);

-- Brand voice memories (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS brand_voice_memories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_text text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE brand_voice_memories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can CRUD own brand voice memories" ON brand_voice_memories;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can CRUD own brand voice memories" ON brand_voice_memories FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_brand_voice_embedding ON brand_voice_memories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_brand_voice_user ON brand_voice_memories (user_id, created_at DESC);

-- Match function (create or replace)
CREATE OR REPLACE FUNCTION match_brand_voice(
  query_embedding vector(1536),
  p_user_id uuid,
  p_match_count int DEFAULT 5,
  p_content_type_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content_type text,
  content_text text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    bvm.id,
    bvm.content_type,
    bvm.content_text,
    bvm.metadata,
    bvm.created_at,
    1 - (bvm.embedding <=> query_embedding) AS similarity
  FROM brand_voice_memories bvm
  WHERE bvm.user_id = p_user_id
    AND (p_content_type_filter IS NULL OR bvm.content_type = p_content_type_filter)
  ORDER BY bvm.embedding <=> query_embedding
  LIMIT p_match_count;
$$;

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  linkedin_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Brand voice profiles table
CREATE TABLE IF NOT EXISTS brand_voice_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Brand Voice',
  tone TEXT[] DEFAULT '{}',
  personality TEXT DEFAULT '',
  vocabulary TEXT[] DEFAULT '{}',
  sentence_length TEXT DEFAULT 'medium' CHECK (sentence_length IN ('short', 'medium', 'long', 'varied')),
  cta_style TEXT DEFAULT '',
  storytelling_style TEXT DEFAULT '',
  content_pillars TEXT[] DEFAULT '{}',
  target_audience TEXT DEFAULT '',
  formatting_style TEXT[] DEFAULT '{}',
  common_phrases TEXT[] DEFAULT '{}',
  favorite_emojis TEXT[] DEFAULT '{}',
  content_sources TEXT[] DEFAULT '{}',
  post_count_analyzed INTEGER DEFAULT 0,
  voice_prompt TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_voice_profiles_user ON brand_voice_profiles(user_id);

ALTER TABLE brand_voice_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own voice profile" ON brand_voice_profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own voice profile" ON brand_voice_profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own voice profile" ON brand_voice_profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own voice profile" ON brand_voice_profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own voice profile" ON brand_voice_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice profile" ON brand_voice_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice profile" ON brand_voice_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voice profile" ON brand_voice_profiles FOR DELETE USING (auth.uid() = user_id);
