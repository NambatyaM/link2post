-- Brand Voice Profiles table
-- Stores the comprehensive voice profile for each user.
-- Every generation reads from this table to match the user's voice.

CREATE TABLE IF NOT EXISTS brand_voice_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Brand Voice',

  -- Core voice attributes
  tone TEXT[] DEFAULT '{}',
  personality TEXT DEFAULT '',
  vocabulary TEXT[] DEFAULT '{}',
  sentence_length TEXT DEFAULT 'medium' CHECK (sentence_length IN ('short', 'medium', 'long', 'varied')),
  cta_style TEXT DEFAULT '',
  storytelling_style TEXT DEFAULT '',

  -- Content strategy
  content_pillars TEXT[] DEFAULT '{}',
  target_audience TEXT DEFAULT '',

  -- Formatting patterns
  formatting_style TEXT[] DEFAULT '{}',
  common_phrases TEXT[] DEFAULT '{}',
  favorite_emojis TEXT[] DEFAULT '{}',

  -- Source metadata
  content_sources TEXT[] DEFAULT '{}',
  post_count_analyzed INTEGER DEFAULT 0,

  -- The full voice prompt text — prepended to every generation
  voice_prompt TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One active voice profile per user (most recent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_voice_profiles_user
  ON brand_voice_profiles(user_id);

-- RLS
ALTER TABLE brand_voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice profile"
  ON brand_voice_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice profile"
  ON brand_voice_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice profile"
  ON brand_voice_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice profile"
  ON brand_voice_profiles FOR DELETE
  USING (auth.uid() = user_id);
