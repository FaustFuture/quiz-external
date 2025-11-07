-- Add used_at column to exam_retakes table
ALTER TABLE exam_retakes 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- Migrate existing data: set used_at to granted_at if used = true, otherwise NULL
UPDATE exam_retakes 
SET used_at = granted_at 
WHERE used = true AND used_at IS NULL;

-- Remove the old boolean column (optional, uncomment if you want to remove it)
-- ALTER TABLE exam_retakes DROP COLUMN IF EXISTS used;

-- Update the index to use used_at instead of used
DROP INDEX IF EXISTS idx_exam_retakes_module_user;
CREATE INDEX IF NOT EXISTS idx_exam_retakes_module_user 
ON exam_retakes(module_id, user_id) 
WHERE used_at IS NULL;

-- Remove duplicate entries first (keep the one with the latest granted_at)
DELETE FROM exam_retakes
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY module_id, user_id ORDER BY granted_at DESC) as rn
        FROM exam_retakes
    ) t
    WHERE rn > 1
);

-- Add unique constraint if it doesn't exist (to prevent duplicate grants)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'exam_retakes_module_user_unique'
    ) THEN
        ALTER TABLE exam_retakes 
        ADD CONSTRAINT exam_retakes_module_user_unique 
        UNIQUE (module_id, user_id);
    END IF;
END $$;

