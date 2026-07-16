-- Add goals column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS goals text;
