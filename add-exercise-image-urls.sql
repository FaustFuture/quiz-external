-- Add array of image URLs to exercises to support up to 4 images
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS image_urls jsonb NULL;


