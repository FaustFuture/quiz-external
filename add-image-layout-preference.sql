-- Add image layout preference to exercises table
ALTER TABLE exercises ADD COLUMN image_layout TEXT DEFAULT 'grid' CHECK (image_layout IN ('grid', 'carousel', 'vertical', 'horizontal'));
