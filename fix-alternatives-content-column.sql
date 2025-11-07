-- Fix alternatives table: Rename 'text' column to 'content' if it exists
-- This migration ensures the alternatives table has a 'content' column instead of 'text'

-- Check if 'text' column exists and rename it to 'content'
DO $$ 
BEGIN
    -- Check if 'text' column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'alternatives' 
        AND column_name = 'text'
    ) THEN
        -- Rename 'text' to 'content'
        ALTER TABLE alternatives RENAME COLUMN text TO content;
        RAISE NOTICE 'Column "text" renamed to "content" successfully';
    ELSE
        RAISE NOTICE 'Column "text" does not exist, no action needed';
    END IF;

    -- Ensure 'content' column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'alternatives' 
        AND column_name = 'content'
    ) THEN
        -- If content doesn't exist, create it
        ALTER TABLE alternatives ADD COLUMN content TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Column "content" created successfully';
    ELSE
        RAISE NOTICE 'Column "content" already exists';
    END IF;
END $$;

-- Handle order_index and order columns
DO $$ 
BEGIN
    -- Check if both columns exist (should not happen, but handle it)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'alternatives' 
        AND column_name = 'order_index'
    ) AND EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'alternatives' 
        AND column_name = 'order'
    ) THEN
        -- Both exist, drop order_index and keep order
        ALTER TABLE alternatives DROP COLUMN order_index;
        RAISE NOTICE 'Column "order_index" dropped (order already exists)';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'alternatives' 
        AND column_name = 'order_index'
    ) THEN
        -- Only order_index exists, rename it to order
        ALTER TABLE alternatives RENAME COLUMN order_index TO "order";
        RAISE NOTICE 'Column "order_index" renamed to "order" successfully';
    ELSIF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'alternatives' 
        AND column_name = 'order'
    ) THEN
        -- Neither exists, create order
        ALTER TABLE alternatives ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Column "order" created successfully';
    ELSE
        RAISE NOTICE 'Column "order" already exists';
    END IF;
END $$;

-- Ensure 'explanation' column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'alternatives' 
        AND column_name = 'explanation'
    ) THEN
        ALTER TABLE alternatives ADD COLUMN explanation TEXT;
        RAISE NOTICE 'Column "explanation" created successfully';
    ELSE
        RAISE NOTICE 'Column "explanation" already exists';
    END IF;
END $$;

-- Ensure 'image_url' and 'image_urls' columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'alternatives' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE alternatives ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Column "image_url" created successfully';
    ELSE
        RAISE NOTICE 'Column "image_url" already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'alternatives' 
        AND column_name = 'image_urls'
    ) THEN
        ALTER TABLE alternatives ADD COLUMN image_urls TEXT[];
        RAISE NOTICE 'Column "image_urls" created successfully';
    ELSE
        RAISE NOTICE 'Column "image_urls" already exists';
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN alternatives.content IS 'The text content of the alternative answer';
COMMENT ON COLUMN alternatives."order" IS 'Order of the alternative within the exercise (0-based)';
COMMENT ON COLUMN alternatives.explanation IS 'Optional explanation for why this alternative is correct or incorrect';
