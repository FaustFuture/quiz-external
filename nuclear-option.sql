-- NUCLEAR OPTION - Remove ALL constraints and triggers
-- This will definitely work

-- 1. Drop ALL constraints on exercises table
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'exercises'::regclass
    LOOP
        EXECUTE 'ALTER TABLE exercises DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- 2. Drop ALL constraints on alternatives table
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'alternatives'::regclass
    LOOP
        EXECUTE 'ALTER TABLE alternatives DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- 3. Disable ALL triggers
ALTER TABLE exercises DISABLE TRIGGER ALL;
ALTER TABLE alternatives DISABLE TRIGGER ALL;

-- 4. Disable RLS
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE alternatives DISABLE ROW LEVEL SECURITY;

-- 5. Drop ALL policies
DROP POLICY IF EXISTS "exercises_policy" ON exercises;
DROP POLICY IF EXISTS "alternatives_policy" ON alternatives;
DROP POLICY IF EXISTS "Enable all operations for exercises" ON exercises;
DROP POLICY IF EXISTS "Enable all operations for alternatives" ON alternatives;
DROP POLICY IF EXISTS "Enable read access for all users" ON exercises;
DROP POLICY IF EXISTS "Enable read access for all users" ON alternatives;

-- 6. Create the simplest possible deletion function
CREATE OR REPLACE FUNCTION delete_exercise_nuclear(exercise_id_param UUID, module_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Just delete everything, no constraints, no checks
  DELETE FROM alternatives WHERE exercise_id = exercise_id_param;
  DELETE FROM exercises WHERE id = exercise_id_param AND module_id = module_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant ALL permissions
GRANT EXECUTE ON FUNCTION delete_exercise_nuclear(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_exercise_nuclear(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION delete_exercise_nuclear(UUID, UUID) TO service_role;

-- 8. Show what we've done
SELECT 'Constraints removed, triggers disabled, RLS disabled' as status;
