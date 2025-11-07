-- Add order column to alternatives table for drag-and-drop ordering

-- Add order column
ALTER TABLE alternatives 
ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Add constraint to ensure order is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'alternatives_order_check'
    ) THEN
        ALTER TABLE alternatives 
        ADD CONSTRAINT alternatives_order_check 
        CHECK ("order" >= 0);
    END IF;
END $$;

-- Create a unique index to ensure unique order per exercise
-- This allows proper drag and drop reordering of alternatives within each exercise
CREATE UNIQUE INDEX IF NOT EXISTS idx_alternatives_exercise_order_unique 
ON alternatives(exercise_id, "order") WHERE "order" >= 0;

-- Add comment
COMMENT ON COLUMN alternatives."order" IS 'Order of the alternative within the exercise (0-based)';
COMMENT ON INDEX idx_alternatives_exercise_order_unique IS 'Ensures unique order per exercise, allowing drag and drop reordering within each exercise';
