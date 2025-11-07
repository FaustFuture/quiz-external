-- First, verify that the exercises table has a primary key
-- If this fails, you need to add: ALTER TABLE exercises ADD PRIMARY KEY (id);

-- Create results table to store overall exam attempts
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exam_answers table to store individual question responses
-- Note: This table requires exercises and alternatives tables to have primary keys
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL,
  selected_alternative_id UUID NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints separately to provide better error handling
DO $$
BEGIN
  -- Add foreign key for exercise_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'exam_answers_exercise_id_fkey'
  ) THEN
    ALTER TABLE exam_answers 
    ADD CONSTRAINT exam_answers_exercise_id_fkey 
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
  END IF;
  
  -- Add foreign key for selected_alternative_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'exam_answers_selected_alternative_id_fkey'
  ) THEN
    ALTER TABLE exam_answers 
    ADD CONSTRAINT exam_answers_selected_alternative_id_fkey 
    FOREIGN KEY (selected_alternative_id) REFERENCES alternatives(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_module_id ON results(module_id);
CREATE INDEX IF NOT EXISTS idx_results_submitted_at ON results(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_answers_result_id ON exam_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_exercise_id ON exam_answers(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_selected_alternative ON exam_answers(selected_alternative_id);

-- Add comments for documentation
COMMENT ON TABLE results IS 'Stores overall exam attempt results for each user and module';
COMMENT ON TABLE exam_answers IS 'Stores individual question responses for detailed analysis';
COMMENT ON COLUMN results.score IS 'Percentage score (0-100)';
COMMENT ON COLUMN exam_answers.time_spent_seconds IS 'Time spent on this question in seconds';

