-- Relax post_type CHECK to support all content types
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
ALTER TABLE posts ALTER COLUMN post_type TYPE text;

-- Relax status CHECK to support the full status lifecycle
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ALTER COLUMN status TYPE text;

-- Add fields for tracking publish time and updates
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add carousel_slides to projects table for carousel persistence
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carousel_slides jsonb;
