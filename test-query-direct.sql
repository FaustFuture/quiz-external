-- ===============================================
-- QUICK TEST: Check if modules have company_id
-- ===============================================
-- Run this first to see what company IDs you actually have

SELECT 
    id as company_id,
    name as company_name
FROM companies;

-- ===============================================
-- Check which company ID your modules have
-- ===============================================
SELECT 
    id as module_id,
    title,
    company_id,
    type
FROM modules
LIMIT 10;

-- ===============================================
-- If company_id is NULL, run this UPDATE
-- Replace 'YOUR-ACTUAL-COMPANY-ID' with the ID from the first query
-- ===============================================

-- First, let's see what we need to update:
SELECT 
    COUNT(*) as modules_needing_update
FROM modules
WHERE company_id IS NULL OR company_id = '';

-- Then update them (uncomment after checking the company ID):
/*
UPDATE modules
SET company_id = 'YOUR-ACTUAL-COMPANY-ID'
WHERE company_id IS NULL OR company_id = '';
*/

-- ===============================================
-- Verify the update worked
-- ===============================================
SELECT 
    title,
    company_id,
    type
FROM modules;

-- Check if results will now show:
WITH company_modules AS (
    SELECT id, title
    FROM modules
    WHERE company_id = 'YOUR-ACTUAL-COMPANY-ID'  -- Use your actual company ID
)
SELECT 
    r.id,
    r.user_name,
    r.score,
    cm.title as module_title,
    r.submitted_at
FROM results r
INNER JOIN company_modules cm ON cm.id = r.module_id
ORDER BY r.submitted_at DESC
LIMIT 10;

