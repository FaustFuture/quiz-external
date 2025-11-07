-- Modular Quiz System Schema for Supabase
-- This schema creates a complete quiz system with modules, exercises, alternatives, and results

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create modules table
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exercises table
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    image_url TEXT,
    weight INTEGER DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alternatives table
CREATE TABLE alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    explanation TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create results table
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes on foreign keys for better performance
CREATE INDEX idx_modules_company_id ON modules(company_id);
CREATE INDEX idx_exercises_module_id ON exercises(module_id);
CREATE INDEX idx_alternatives_exercise_id ON alternatives(exercise_id);
CREATE INDEX idx_results_user_id ON results(user_id);
CREATE INDEX idx_results_module_id ON results(module_id);

-- Create indexes on order columns for efficient sorting
CREATE INDEX idx_modules_order ON modules("order");
CREATE INDEX idx_exercises_order ON exercises("order");
CREATE INDEX idx_alternatives_order ON alternatives("order");

-- Create indexes on created_at for time-based queries
CREATE INDEX idx_modules_created_at ON modules(created_at);
CREATE INDEX idx_exercises_created_at ON exercises(created_at);
CREATE INDEX idx_alternatives_created_at ON alternatives(created_at);
CREATE INDEX idx_results_submitted_at ON results(submitted_at);

-- Add constraints to ensure data integrity
ALTER TABLE modules ADD CONSTRAINT modules_order_positive CHECK ("order" >= 0);
ALTER TABLE exercises ADD CONSTRAINT exercises_weight_positive CHECK (weight > 0);
ALTER TABLE exercises ADD CONSTRAINT exercises_order_positive CHECK ("order" >= 0);
ALTER TABLE alternatives ADD CONSTRAINT alternatives_order_positive CHECK ("order" >= 0);
ALTER TABLE results ADD CONSTRAINT results_score_range CHECK (score >= 0 AND score <= 100);

-- Add unique constraints to prevent duplicate orders within the same parent
CREATE UNIQUE INDEX idx_modules_order_unique ON modules("order") WHERE "order" > 0;
CREATE UNIQUE INDEX idx_exercises_module_order_unique ON exercises(module_id, "order") WHERE "order" > 0;
CREATE UNIQUE INDEX idx_alternatives_exercise_order_unique ON alternatives(exercise_id, "order") WHERE "order" > 0;

-- Add a constraint to ensure at least one correct alternative per exercise
CREATE OR REPLACE FUNCTION check_correct_alternative()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if there's at least one correct alternative for the exercise
    IF NOT EXISTS (
        SELECT 1 FROM alternatives 
        WHERE exercise_id = COALESCE(NEW.exercise_id, OLD.exercise_id) 
        AND is_correct = TRUE
    ) THEN
        RAISE EXCEPTION 'Each exercise must have at least one correct alternative';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the constraint
CREATE TRIGGER trigger_check_correct_alternative
    AFTER INSERT OR UPDATE OR DELETE ON alternatives
    FOR EACH ROW
    EXECUTE FUNCTION check_correct_alternative();

-- Add comments for documentation
COMMENT ON TABLE modules IS 'Quiz modules containing multiple exercises, organized by company';
COMMENT ON TABLE exercises IS 'Individual quiz questions within modules';
COMMENT ON TABLE alternatives IS 'Answer options for each exercise';
COMMENT ON TABLE results IS 'User quiz completion results';

COMMENT ON COLUMN modules.company_id IS 'Company that owns this module';
COMMENT ON COLUMN modules."order" IS 'Sort order for modules display';
COMMENT ON COLUMN exercises.weight IS 'Point weight for this exercise';
COMMENT ON COLUMN exercises."order" IS 'Sort order for exercises within module';
COMMENT ON COLUMN alternatives.is_correct IS 'Whether this alternative is the correct answer';
COMMENT ON COLUMN alternatives."order" IS 'Sort order for alternatives within exercise';
COMMENT ON COLUMN results.score IS 'Quiz score as percentage (0-100)';
