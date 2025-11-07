-- Add optional image_url to alternatives for image-based options
ALTER TABLE alternatives
ADD COLUMN IF NOT EXISTS image_url text NULL;

-- Multiple images support
ALTER TABLE alternatives
ADD COLUMN IF NOT EXISTS image_urls jsonb NULL;


