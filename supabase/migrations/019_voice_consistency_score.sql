-- Add voice_consistency_score to posts for brand voice tracking
ALTER TABLE posts ADD COLUMN IF NOT EXISTS voice_consistency_score jsonb;

-- Add index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_posts_voice_consistency ON posts (user_id) WHERE voice_consistency_score IS NOT NULL;
