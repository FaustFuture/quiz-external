-- Simple direct update of all modules to have company_id
-- Run this in Supabase SQL Editor

-- Update ALL modules to have company_id = 'test-company'
UPDATE modules
SET company_id = 'test-company';

-- Verify the update worked
SELECT 
    id,
    title,
    company_id,
    type,
    created_at
FROM modules
ORDER BY created_at DESC;

