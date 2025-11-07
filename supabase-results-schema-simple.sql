-- Simple version of results schema
-- This version creates the tables without foreign key constraints first,
-- then adds them separately with better error handling

-- Step 1: Create results table
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  module_id UUID NOT NULL,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create exam_answers table (without foreign keys initially)
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  selected_alternative_id UUID NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes first
CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_module_id ON results(module_id);
CREATE INDEX IF NOT EXISTS idx_results_submitted_at ON results(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_answers_result_id ON exam_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_exercise_id ON exam_answers(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_selected_alternative ON exam_answers(selected_alternative_id);

-- Step 4: Add foreign key constraints one by one
-- This approach allows us to see which specific constraint is failing

-- Add FK for results.module_id
DO $$
BEGIN
  ALTER TABLE results 
    ADD CONSTRAINT results_module_id_fkey 
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added foreign key: results.module_id -> modules.id';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add FK for results.module_id: %', SQLERRM;
END $$;

-- Add FK for exam_answers.result_id
DO $$
BEGIN
  ALTER TABLE exam_answers 
    ADD CONSTRAINT exam_answers_result_id_fkey 
    FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added foreign key: exam_answers.result_id -> results.id';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add FK for exam_answers.result_id: %', SQLERRM;
END $$;

-- Add FK for exam_answers.exercise_id
DO $$
BEGIN
  ALTER TABLE exam_answers 
    ADD CONSTRAINT exam_answers_exercise_id_fkey 
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added foreign key: exam_answers.exercise_id -> exercises.id';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add FK for exam_answers.exercise_id: %', SQLERRM;
    RAISE NOTICE 'This usually means exercises table does not have a primary key on id column';
    RAISE NOTICE 'Try running: ALTER TABLE exercises ADD PRIMARY KEY (id);';
END $$;

-- Add FK for exam_answers.selected_alternative_id
DO $$
BEGIN
  ALTER TABLE exam_answers 
    ADD CONSTRAINT exam_answers_selected_alternative_id_fkey 
    FOREIGN KEY (selected_alternative_id) REFERENCES alternatives(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added foreign key: exam_answers.selected_alternative_id -> alternatives.id';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add FK for exam_answers.selected_alternative_id: %', SQLERRM;
    RAISE NOTICE 'This usually means alternatives table does not have a primary key on id column';
    RAISE NOTICE 'Try running: ALTER TABLE alternatives ADD PRIMARY KEY (id);';
END $$;

-- Step 5: Add comments for documentation
COMMENT ON TABLE results IS 'Stores overall exam attempt results for each user and module';
COMMENT ON TABLE exam_answers IS 'Stores individual question responses for detailed analysis';
COMMENT ON COLUMN results.score IS 'Percentage score (0-100)';
COMMENT ON COLUMN exam_answers.time_spent_seconds IS 'Time spent on this question in seconds';

-- Step 6: Verify what was created
SELECT 'Tables created successfully!' as status;

SELECT 
  'Foreign key constraints:' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('results', 'exam_answers')
  AND tc.constraint_type = 'FOREIGN KEY';

