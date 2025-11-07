-- Fix exam schema - Add missing columns and tables
-- This will update your existing database to support exam results

-- Step 1: Update the existing results table to add missing columns
ALTER TABLE results 
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS total_questions INTEGER,
ADD COLUMN IF NOT EXISTS correct_answers INTEGER;

-- Step 2: Create exam_answers table if it doesn't exist
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  selected_alternative_id UUID NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_module_id ON results(module_id);
CREATE INDEX IF NOT EXISTS idx_results_submitted_at ON results(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_answers_result_id ON exam_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_exercise_id ON exam_answers(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_selected_alternative ON exam_answers(selected_alternative_id);

-- Step 4: Add foreign key constraints with error handling
DO $$
BEGIN
  -- FK: results.module_id -> modules.id
  ALTER TABLE results 
    ADD CONSTRAINT results_module_id_fkey 
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;
  RAISE NOTICE '✓ Added FK: results.module_id -> modules.id';
EXCEPTION
  WHEN others THEN
    RAISE WARNING '✗ Could not add FK for results.module_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- FK: exam_answers.result_id -> results.id
  ALTER TABLE exam_answers 
    ADD CONSTRAINT exam_answers_result_id_fkey 
    FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE;
  RAISE NOTICE '✓ Added FK: exam_answers.result_id -> results.id';
EXCEPTION
  WHEN others THEN
    RAISE WARNING '✗ Could not add FK for exam_answers.result_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- FK: exam_answers.exercise_id -> exercises.id
  ALTER TABLE exam_answers 
    ADD CONSTRAINT exam_answers_exercise_id_fkey 
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
  RAISE NOTICE '✓ Added FK: exam_answers.exercise_id -> exercises.id';
EXCEPTION
  WHEN others THEN
    RAISE WARNING '✗ Could not add FK for exam_answers.exercise_id: %', SQLERRM;
    RAISE WARNING 'This usually means exercises table does not have a primary key on id column';
    RAISE WARNING 'Try running: ALTER TABLE exercises ADD PRIMARY KEY (id);';
END $$;

DO $$
BEGIN
  -- FK: exam_answers.selected_alternative_id -> alternatives.id
  ALTER TABLE exam_answers 
    ADD CONSTRAINT exam_answers_selected_alternative_id_fkey 
    FOREIGN KEY (selected_alternative_id) REFERENCES alternatives(id) ON DELETE CASCADE;
  RAISE NOTICE '✓ Added FK: exam_answers.selected_alternative_id -> alternatives.id';
EXCEPTION
  WHEN others THEN
    RAISE WARNING '✗ Could not add FK for exam_answers.selected_alternative_id: %', SQLERRM;
    RAISE WARNING 'This usually means alternatives table does not have a primary key on id column';
    RAISE WARNING 'Try running: ALTER TABLE alternatives ADD PRIMARY KEY (id);';
END $$;

-- Step 5: Verify the schema
SELECT 'Schema update completed!' as status;

-- Show the updated results table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'results' 
ORDER BY ordinal_position;

-- Show the exam_answers table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'exam_answers' 
ORDER BY ordinal_position;
