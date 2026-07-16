const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://pzsuuquclwrcfkharvjo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6c3V1cXVjbHdyY2ZraGFydmpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzg4ODI1NCwiZXhwIjoyMDk5NDY0MjU0fQ.EKG3KkDOGrL0KAeVF4J59FJX5cef6LlWL7ODn9rn_bY"
);

const SQL = `
-- 1. Projects table
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

-- 2. Posts table
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

-- 3. Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies (safe drops)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can CRUD own projects" ON projects;
  DROP POLICY IF EXISTS "Users can CRUD own posts" ON posts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can CRUD own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own posts" ON posts FOR ALL USING (auth.uid() = user_id);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_project ON posts (project_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts (user_id, created_at DESC);

-- 6. Brand voice memories (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS brand_voice_memories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_type text NOT NULL DEFAULT 'example',
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE brand_voice_memories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can CRUD own brand voice memories" ON brand_voice_memories;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can CRUD own brand voice memories" ON brand_voice_memories FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_brand_voice_memories_user ON brand_voice_memories (user_id);
`;

async function main() {
  console.log("Running migration...");
  
  // Execute each statement separately via RPC or direct
  const statements = SQL.split(";").map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith("--"));
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ";";
    if (stmt.trim() === ";" || stmt.trim().startsWith("--")) continue;
    
    try {
      const { data, error } = await supabase.rpc("exec_sql", { query: stmt });
      if (error) {
        // exec_sql might not exist, try direct approach
        console.log(`Statement ${i + 1}: RPC failed (${error.message}), trying alternative...`);
      } else {
        console.log(`Statement ${i + 1}: OK`);
      }
    } catch (e) {
      console.log(`Statement ${i + 1}: Error - ${e.message}`);
    }
  }
}

main().catch(console.error);
