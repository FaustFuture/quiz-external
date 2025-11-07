-- Add missing columns to exercises table

-- Add order column for exercise ordering
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Add constraint to ensure order is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'exercises_order_check'
    ) THEN
        ALTER TABLE exercises 
        ADD CONSTRAINT exercises_order_check 
        CHECK ("order" >= 0);
    END IF;
END $$;

-- Create index on order column for better query performance
CREATE INDEX IF NOT EXISTS idx_exercises_module_order ON exercises(module_id, "order");

-- Add weight column for scoring
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS weight INTEGER NOT NULL DEFAULT 1;

-- Add constraint to ensure weight is positive
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'exercises_weight_check'
    ) THEN
        ALTER TABLE exercises 
        ADD CONSTRAINT exercises_weight_check 
        CHECK (weight > 0);
    END IF;
END $$;

-- Add image_layout column
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS image_layout TEXT NOT NULL DEFAULT 'grid';

-- Add constraint for valid image_layout values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'exercises_image_layout_check'
    ) THEN
        ALTER TABLE exercises 
        ADD CONSTRAINT exercises_image_layout_check 
        CHECK (image_layout IN ('grid', 'carousel', 'vertical', 'horizontal'));
    END IF;
END $$;

-- Add image_urls column (array of image URLs)
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Add video_url column
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add image_display_size column
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS image_display_size TEXT DEFAULT 'medium';

-- Add constraint for valid image_display_size values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'exercises_image_display_size_check'
    ) THEN
        ALTER TABLE exercises 
        ADD CONSTRAINT exercises_image_display_size_check 
        CHECK (image_display_size IN ('small', 'medium', 'large', 'full'));
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN exercises."order" IS 'Order of the exercise within the module (0-based)';
COMMENT ON COLUMN exercises.weight IS 'Point value/weight of the exercise for scoring';
COMMENT ON COLUMN exercises.image_layout IS 'Layout style for displaying images: grid, carousel, vertical, or horizontal';
COMMENT ON COLUMN exercises.image_urls IS 'Array of multiple image URLs for the exercise';
COMMENT ON COLUMN exercises.video_url IS 'URL of video content for the exercise';
COMMENT ON COLUMN exercises.image_display_size IS 'Display size for images: small, medium, large, or full';
