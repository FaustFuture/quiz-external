-- Add image_display_size column to exercises table
ALTER TABLE exercises ADD COLUMN image_display_size TEXT DEFAULT 'aspect-ratio';

-- Update existing exercises to have the default value
UPDATE exercises SET image_display_size = 'aspect-ratio' WHERE image_display_size IS NULL;
