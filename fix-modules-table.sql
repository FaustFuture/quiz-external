-- Fix modules table - Add missing is_unlocked column
-- This will fix the module creation error

-- 1. Add the missing is_unlocked column to modules table
ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT true;

-- 2. Add the missing type column if it doesn't exist
ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'module' CHECK (type IN ('module', 'exam'));

-- 3. Update existing modules to have the correct default values
UPDATE modules 
SET is_unlocked = true 
WHERE is_unlocked IS NULL;

UPDATE modules 
SET type = 'module' 
WHERE type IS NULL;

-- 4. Show the updated modules table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'modules' 
ORDER BY ordinal_position;

-- 5. Test that we can now create a module
DO $$
DECLARE
    test_company_id TEXT := 'test-company';
    test_module_id UUID;
BEGIN
    -- Try to insert a test module
    INSERT INTO modules (company_id, title, description, type, is_unlocked)
    VALUES (test_company_id, 'Test Module', 'Test Description', 'module', true)
    RETURNING id INTO test_module_id;
    
    -- If we get here, the insert worked
    RAISE NOTICE '✓ Module creation test PASSED - is_unlocked column is working';
    RAISE NOTICE 'Created test module with ID: %', test_module_id;
    
    -- Clean up the test module
    DELETE FROM modules WHERE id = test_module_id;
    RAISE NOTICE '✓ Test module cleaned up';
    
EXCEPTION
    WHEN others THEN
        RAISE WARNING '✗ Module creation test FAILED: %', SQLERRM;
        RAISE WARNING 'This means there are still issues with the modules table';
END $$;
