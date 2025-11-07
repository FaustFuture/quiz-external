-- Update the alternatives table to keep options when exercise is deleted
-- This removes the CASCADE delete constraint

-- First, drop the existing foreign key constraint
ALTER TABLE alternatives DROP CONSTRAINT IF EXISTS alternatives_exercise_id_fkey;

-- Make exercise_id nullable so we can set it to NULL when exercise is deleted
ALTER TABLE alternatives ALTER COLUMN exercise_id DROP NOT NULL;

-- Add the foreign key constraint with SET NULL instead of CASCADE
-- This will keep the alternatives but set exercise_id to NULL when exercise is deleted
ALTER TABLE alternatives 
ADD CONSTRAINT alternatives_exercise_id_fkey 
FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL;

-- Add a comment to explain the change
COMMENT ON COLUMN alternatives.exercise_id IS 'References the exercise this alternative belongs to. Can be NULL if the exercise was deleted but alternative is kept for potential reuse.';

-- Create a function to delete exercise while preserving alternatives
CREATE OR REPLACE FUNCTION delete_exercise_keep_alternatives(
  exercise_id_param UUID,
  module_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  -- First, set all alternatives for this exercise to have NULL exercise_id
  UPDATE alternatives 
  SET exercise_id = NULL 
  WHERE exercise_id = exercise_id_param;
  
  -- Then delete the exercise
  DELETE FROM exercises 
  WHERE id = exercise_id_param 
  AND module_id = module_id_param;
END;
$$ LANGUAGE plpgsql;
