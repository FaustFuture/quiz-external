-- Supabase Schema Setup for Quiz Platform with Supabase Auth
-- Run this in your Supabase SQL Editor

-- =======================
-- 1. COMPANIES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- 2. COMPANIES_USERS TABLE (Junction Table)
-- =======================
-- Track which users belong to which companies and their roles
CREATE TABLE IF NOT EXISTS companies_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' or 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- =======================
-- 3. USERS CACHE TABLE
-- =======================
-- Cache user data from Supabase Auth for faster lookups
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- 4. MODULES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  type TEXT DEFAULT 'quiz', -- 'quiz' or 'exam'
  is_unlocked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- 4. EXERCISES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  image_url TEXT,
  alternative_image_url TEXT,
  video_url TEXT,
  image_display_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large', 'full'
  image_layout_preference TEXT DEFAULT 'top', -- 'top', 'bottom', 'left', 'right'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- 5. ALTERNATIVES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS alternatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  explanation TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  image_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- 6. RESULTS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- References auth.users(id)
  user_name TEXT,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- 7. EXAM_ANSWERS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  selected_alternative_id UUID NOT NULL REFERENCES alternatives(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================
-- 8. EXAM_RETAKES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS exam_retakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References auth.users(id)
  granted_by UUID NOT NULL, -- References auth.users(id) of admin
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  UNIQUE(module_id, user_id)
);

-- =======================
-- INDEXES FOR PERFORMANCE
-- =======================
CREATE INDEX IF NOT EXISTS idx_companies_users_company_id ON companies_users(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_users_user_id ON companies_users(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_company_id ON modules(company_id);
CREATE INDEX IF NOT EXISTS idx_exercises_module_id ON exercises(module_id);
CREATE INDEX IF NOT EXISTS idx_alternatives_exercise_id ON alternatives(exercise_id);
CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_module_id ON results(module_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_result_id ON exam_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_exam_retakes_module_user ON exam_retakes(module_id, user_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- =======================
-- ROW LEVEL SECURITY (RLS)
-- =======================
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_retakes ENABLE ROW LEVEL SECURITY;

-- =======================
-- RLS POLICIES - Companies
-- =======================
-- Anyone can read companies
CREATE POLICY "Anyone can read companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- Only owner can update their company
CREATE POLICY "Owners can update their companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- Authenticated users can insert companies
CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =======================
-- RLS POLICIES - Companies_Users
-- =======================
-- Users can read their company memberships
CREATE POLICY "Users can read their company memberships"
  ON companies_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can join companies
CREATE POLICY "Users can join companies"
  ON companies_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can update and delete memberships in their companies
CREATE POLICY "Admins can update memberships"
  ON companies_users FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM companies_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete memberships"
  ON companies_users FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM companies_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =======================
-- RLS POLICIES - Users Cache
-- =======================
-- Anyone can read user cache
CREATE POLICY "Anyone can read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own cache record
CREATE POLICY "Users can insert their cache"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- =======================
-- RLS POLICIES - Modules
-- =======================
-- Anyone can read modules
CREATE POLICY "Anyone can read modules"
  ON modules FOR SELECT
  TO authenticated
  USING (true);

-- Company admins can manage modules
CREATE POLICY "Company admins can manage modules"
  ON modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies_users
      WHERE companies_users.company_id = modules.company_id
      AND companies_users.user_id = auth.uid()
      AND companies_users.role = 'admin'
    )
  );

-- =======================
-- RLS POLICIES - Exercises
-- =======================
-- Anyone can read exercises
CREATE POLICY "Anyone can read exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (true);

-- Company admins can manage exercises
CREATE POLICY "Company admins can manage exercises"
  ON exercises FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN companies_users ON companies_users.company_id = modules.company_id
      WHERE modules.id = exercises.module_id
      AND companies_users.user_id = auth.uid()
      AND companies_users.role = 'admin'
    )
  );

-- =======================
-- RLS POLICIES - Alternatives
-- =======================
-- Anyone can read alternatives
CREATE POLICY "Anyone can read alternatives"
  ON alternatives FOR SELECT
  TO authenticated
  USING (true);

-- Company admins can manage alternatives
CREATE POLICY "Company admins can manage alternatives"
  ON alternatives FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exercises
      JOIN modules ON modules.id = exercises.module_id
      JOIN companies_users ON companies_users.company_id = modules.company_id
      WHERE exercises.id = alternatives.exercise_id
      AND companies_users.user_id = auth.uid()
      AND companies_users.role = 'admin'
    )
  );

-- =======================
-- RLS POLICIES - Results
-- =======================
-- Users can read their own results
CREATE POLICY "Users can read their own results"
  ON results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Company admins can read all results for their modules
CREATE POLICY "Company admins can read all results"
  ON results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN companies_users ON companies_users.company_id = modules.company_id
      WHERE modules.id = results.module_id
      AND companies_users.user_id = auth.uid()
      AND companies_users.role = 'admin'
    )
  );

-- Anyone can insert results (for taking exams)
CREATE POLICY "Anyone can submit results"
  ON results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =======================
-- RLS POLICIES - Exam Answers
-- =======================
-- Users can read their own exam answers
CREATE POLICY "Users can read their own answers"
  ON exam_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM results
      WHERE results.id = exam_answers.result_id
      AND results.user_id = auth.uid()
    )
  );

-- Company admins can read all answers
CREATE POLICY "Company admins can read all answers"
  ON exam_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM results
      JOIN modules ON modules.id = results.module_id
      JOIN companies_users ON companies_users.company_id = modules.company_id
      WHERE results.id = exam_answers.result_id
      AND companies_users.user_id = auth.uid()
      AND companies_users.role = 'admin'
    )
  );

-- Anyone can insert answers when submitting
CREATE POLICY "Anyone can submit answers"
  ON exam_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM results
      WHERE results.id = exam_answers.result_id
      AND results.user_id = auth.uid()
    )
  );

-- =======================
-- RLS POLICIES - Exam Retakes
-- =======================
-- Users can read their own retakes
CREATE POLICY "Users can read their retakes"
  ON exam_retakes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Company admins can manage retakes
CREATE POLICY "Company admins can manage retakes"
  ON exam_retakes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN companies_users ON companies_users.company_id = modules.company_id
      WHERE modules.id = exam_retakes.module_id
      AND companies_users.user_id = auth.uid()
      AND companies_users.role = 'admin'
    )
  );

-- =======================
-- UPDATED_AT TRIGGER
-- =======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =======================
-- STORAGE BUCKET (for images)
-- =======================
-- Create storage bucket for quiz images
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-images', 'quiz-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'quiz-images');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quiz-images');

CREATE POLICY "Users can update their uploaded images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'quiz-images');

CREATE POLICY "Users can delete their uploaded images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quiz-images');

-- =======================
-- DONE!
-- =======================
-- Your database is now ready for Supabase Auth!
-- 
-- Next steps:
-- 1. Enable Email Auth in Supabase Dashboard
-- 2. Configure redirect URLs
-- 3. Create your first account at /login
-- 4. Get your user ID from Supabase Dashboard
-- 5. Insert a company and set yourself as owner:
--    INSERT INTO companies (id, name, owner_user_id)
--    VALUES ('my-company', 'My Company', 'YOUR-USER-ID-HERE');
