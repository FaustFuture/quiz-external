-- Fix the alternatives order constraint to be unique per exercise instead of globally
-- This will allow proper drag and drop reordering of options within exercises

-- First, drop the existing unique constraint
DROP INDEX IF EXISTS idx_alternatives_exercise_order_unique;

-- Create a new unique constraint that's scoped to exercise_id
-- This allows the same order number for different exercises
CREATE UNIQUE INDEX idx_alternatives_exercise_order_unique ON alternatives(exercise_id, "order") WHERE "order" >= 0;

-- Add a comment to explain the change
COMMENT ON INDEX idx_alternatives_exercise_order_unique IS 'Ensures unique order per exercise, allowing drag and drop reordering within each exercise';
