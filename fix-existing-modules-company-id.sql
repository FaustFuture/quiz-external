-- ===============================================
-- Fix Existing Modules - Multi-Company Auto-Detection
-- ===============================================
-- This script intelligently assigns company_id to orphaned modules
-- Run this in your Supabase SQL Editor

-- ===============================================
-- STEP 1: Diagnostic - Check Current Situation
-- ===============================================

-- Show all companies in your system
SELECT 
    id as company_id,
    name as company_name,
    owner_user_id,
    created_at
FROM companies
ORDER BY created_at DESC;

-- Show modules missing company_id
SELECT 
    id as module_id,
    title,
    company_id,
    type,
    created_at
FROM modules
WHERE company_id IS NULL OR company_id = ''
ORDER BY created_at DESC;

-- Count of orphaned modules
SELECT COUNT(*) as orphaned_modules_count
FROM modules
WHERE company_id IS NULL OR company_id = '';

-- ===============================================
-- STEP 2: SMART AUTO-FIX (Recommended for Multi-Company)
-- ===============================================
-- This attempts to assign modules to companies based on results data
-- Logic: If users from a specific company took a quiz, that module belongs to that company

-- First, let's see which modules have results and from which companies
SELECT 
    m.id as module_id,
    m.title,
    m.company_id as current_company_id,
    cu.company_id as detected_company_id,
    c.name as detected_company_name,
    COUNT(DISTINCT r.user_id) as users_who_took_quiz,
    COUNT(r.id) as total_submissions
FROM modules m
LEFT JOIN results r ON r.module_id = m.id
LEFT JOIN companies_users cu ON cu.user_id = r.user_id
LEFT JOIN companies c ON c.id = cu.company_id
WHERE (m.company_id IS NULL OR m.company_id = '')
GROUP BY m.id, m.title, m.company_id, cu.company_id, c.name
ORDER BY total_submissions DESC;

-- ===============================================
-- AUTOMATIC FIX: Assign modules based on results data
-- ===============================================
-- This query assigns orphaned modules to the company whose users took the quiz

UPDATE modules m
SET company_id = subquery.detected_company_id
FROM (
    SELECT DISTINCT ON (r.module_id)
        r.module_id,
        cu.company_id as detected_company_id
    FROM results r
    JOIN companies_users cu ON cu.user_id = r.user_id
    WHERE cu.company_id IS NOT NULL
    GROUP BY r.module_id, cu.company_id
    ORDER BY r.module_id, COUNT(*) DESC  -- Assign to company with most results
) AS subquery
WHERE m.id = subquery.module_id
  AND (m.company_id IS NULL OR m.company_id = '');

-- ===============================================
-- FALLBACK: If no results exist for some modules
-- ===============================================
-- For modules with no results, assign to the first/oldest company

-- Check if any orphaned modules still remain
SELECT COUNT(*) as still_orphaned
FROM modules
WHERE company_id IS NULL OR company_id = '';

-- If there's only ONE company, assign remaining orphaned modules to it
DO $$
DECLARE
    single_company_id TEXT;
    company_count INTEGER;
BEGIN
    -- Count how many companies exist
    SELECT COUNT(*) INTO company_count FROM companies;
    
    -- If only one company exists, auto-assign
    IF company_count = 1 THEN
        SELECT id INTO single_company_id FROM companies LIMIT 1;
        
        UPDATE modules
        SET company_id = single_company_id
        WHERE company_id IS NULL OR company_id = '';
        
        RAISE NOTICE 'Auto-assigned orphaned modules to company: %', single_company_id;
    ELSE
        RAISE NOTICE 'Multiple companies exist. Manual assignment may be needed for modules without results.';
    END IF;
END $$;

-- ===============================================
-- MANUAL OVERRIDE: If you need to assign specific modules
-- ===============================================
-- Uncomment and customize if the automatic detection missed some modules:

/*
-- Option 1: Assign specific module by ID
UPDATE modules
SET company_id = 'your-company-id-here'
WHERE id = 'specific-module-uuid-here';

-- Option 2: Assign by title pattern
UPDATE modules
SET company_id = 'company-a'
WHERE (company_id IS NULL OR company_id = '')
  AND title ILIKE '%keyword%';

-- Option 3: Assign all remaining orphaned to one company
UPDATE modules
SET company_id = 'default-company-id'
WHERE company_id IS NULL OR company_id = '';
*/

-- ===============================================
-- STEP 3: Verification - Confirm Fix Worked
-- ===============================================

-- Check for any remaining orphaned modules
SELECT 
    id,
    title,
    company_id,
    type,
    created_at
FROM modules
WHERE company_id IS NULL OR company_id = ''
ORDER BY created_at DESC;

-- Count verification
SELECT 
    CASE 
        WHEN company_id IS NULL OR company_id = '' THEN 'Still Orphaned'
        ELSE 'Fixed - Has company_id'
    END as status,
    COUNT(*) as module_count
FROM modules
GROUP BY status;

-- Show distribution of modules across companies
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(m.id) as module_count,
    STRING_AGG(m.title, ', ') as module_titles
FROM companies c
LEFT JOIN modules m ON m.company_id = c.id
GROUP BY c.id, c.name
ORDER BY module_count DESC;

-- ===============================================
-- SUCCESS CRITERIA
-- ===============================================
-- ✅ "Still Orphaned" count should be 0
-- ✅ Each company should show their modules
-- ✅ All modules should have a company_id

-- After running this script successfully:
-- 1. Go to your app dashboard
-- 2. Hard refresh (Ctrl+Shift+R)
-- 3. Results should now appear in the sidebar!
-- 4. Download button will be enabled!
