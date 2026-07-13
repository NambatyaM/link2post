-- Add feedback_text column to capture why users dislike content
ALTER TABLE calendar_items
  ADD COLUMN IF NOT EXISTS feedback_text text;
