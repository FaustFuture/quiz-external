-- Migration script to add missing columns to results table
-- Run this in Supabase SQL Editor if your results table already exists
-- but is missing the correct_answers and total_questions columns

-- Check current structure of results table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'results'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add total_questions column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'results' AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE results ADD COLUMN total_questions INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added column: total_questions';
  ELSE
    RAISE NOTICE 'Column total_questions already exists';
  END IF;

  -- Add correct_answers column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'results' AND column_name = 'correct_answers'
  ) THEN
    ALTER TABLE results ADD COLUMN correct_answers INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added column: correct_answers';
  ELSE
    RAISE NOTICE 'Column correct_answers already exists';
  END IF;

  -- Add created_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'results' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE results ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added column: created_at';
  ELSE
    RAISE NOTICE 'Column created_at already exists';
  END IF;
END $$;

-- Verify the structure is correct now
SELECT 'Updated results table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'results'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- user_id (text)
-- module_id (uuid)
-- score (numeric)
-- total_questions (integer) <- NEW
-- correct_answers (integer) <- NEW
-- submitted_at (timestamptz)
-- created_at (timestamptz) <- NEW

