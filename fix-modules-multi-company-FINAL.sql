-- ===============================================
-- SMART FIX: Auto-Detect Correct Company for Each Module
-- ===============================================
-- This works for multi-company setups
-- Run this entire script in Supabase SQL Editor

-- ===============================================
-- STEP 1: Diagnostic - See Current State
-- ===============================================

-- Show all companies
SELECT '=== ALL COMPANIES ===' as info;
SELECT id, name, owner_user_id FROM companies ORDER BY created_at;

-- Show modules and their current company_id status
SELECT '=== MODULES STATUS ===' as info;
SELECT 
    id, 
    title, 
    CASE 
        WHEN company_id IS NULL THEN 'NULL'
        WHEN company_id = '' THEN 'EMPTY'
        ELSE company_id
    END as company_id_status,
    type
FROM modules
ORDER BY created_at DESC;

-- Count orphaned modules
SELECT '=== ORPHANED MODULE COUNT ===' as info;
SELECT COUNT(*) as orphaned_modules FROM modules WHERE company_id IS NULL OR company_id = '';

-- ===============================================
-- STEP 2: AUTO-FIX - Assign Modules Based on Results
-- ===============================================
-- Logic: If users from Company A took a quiz, that quiz belongs to Company A

SELECT '=== DETECTING COMPANY FROM RESULTS ===' as info;

-- See which company's users took each orphaned module
SELECT 
    m.id as module_id,
    m.title,
    cu.company_id,
    c.name as company_name,
    COUNT(r.id) as quiz_attempts
FROM modules m
LEFT JOIN results r ON r.module_id = m.id
LEFT JOIN companies_users cu ON cu.user_id = r.user_id
LEFT JOIN companies c ON c.id = cu.company_id
WHERE (m.company_id IS NULL OR m.company_id = '')
GROUP BY m.id, m.title, cu.company_id, c.name
ORDER BY m.title, quiz_attempts DESC;

-- Now perform the actual update
UPDATE modules m
SET company_id = subquery.detected_company_id
FROM (
    SELECT DISTINCT ON (r.module_id)
        r.module_id,
        cu.company_id as detected_company_id
    FROM results r
    INNER JOIN companies_users cu ON cu.user_id = r.user_id
    WHERE cu.company_id IS NOT NULL
    GROUP BY r.module_id, cu.company_id
    ORDER BY r.module_id, COUNT(r.id) DESC  -- Assign to company with most attempts
) AS subquery
WHERE m.id = subquery.module_id
  AND (m.company_id IS NULL OR m.company_id = '');

SELECT '=== STEP 2 COMPLETE ===' as info;
SELECT COUNT(*) as modules_fixed_from_results 
FROM modules 
WHERE company_id IS NOT NULL AND company_id != '';

-- ===============================================
-- STEP 3: FALLBACK - Handle Modules Without Results
-- ===============================================
-- For modules that have never been taken by anyone

SELECT '=== REMAINING ORPHANED MODULES ===' as info;
SELECT 
    id,
    title,
    type
FROM modules
WHERE company_id IS NULL OR company_id = ''
ORDER BY created_at;

-- Option A: If you have only ONE company, assign remaining modules to it
DO $$
DECLARE
    company_count INTEGER;
    first_company_id TEXT;
    modules_updated INTEGER;
BEGIN
    -- Count total companies
    SELECT COUNT(*) INTO company_count FROM companies;
    
    IF company_count = 1 THEN
        -- Get the single company ID
        SELECT id INTO first_company_id FROM companies LIMIT 1;
        
        -- Update orphaned modules
        UPDATE modules
        SET company_id = first_company_id
        WHERE company_id IS NULL OR company_id = '';
        
        GET DIAGNOSTICS modules_updated = ROW_COUNT;
        
        RAISE NOTICE '✓ Single company detected: %', first_company_id;
        RAISE NOTICE '✓ Assigned % orphaned modules to this company', modules_updated;
    ELSE
        RAISE NOTICE '⚠ Multiple companies exist (%). Cannot auto-assign remaining orphaned modules.', company_count;
        RAISE NOTICE '→ You need to manually assign modules without results.';
    END IF;
END $$;

-- ===============================================
-- STEP 4: Manual Assignment (If Needed)
-- ===============================================
-- If you have multiple companies and some modules with no results,
-- uncomment and customize these queries:

/*
-- Example: Assign specific modules by title pattern
UPDATE modules
SET company_id = 'company-a'
WHERE (company_id IS NULL OR company_id = '')
  AND title ILIKE '%Company A%';

-- Example: Assign specific modules by ID
UPDATE modules
SET company_id = 'company-b'
WHERE id IN (
    'module-uuid-1',
    'module-uuid-2',
    'module-uuid-3'
);

-- Example: Assign all remaining to a default company
UPDATE modules
SET company_id = 'default-company-id'
WHERE company_id IS NULL OR company_id = '';
*/

-- ===============================================
-- STEP 5: VERIFICATION
-- ===============================================

SELECT '=== FINAL VERIFICATION ===' as info;

-- Check for any remaining orphaned modules
SELECT 
    COUNT(*) as still_orphaned,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL FIXED!'
        ELSE '⚠ Manual assignment needed'
    END as status
FROM modules
WHERE company_id IS NULL OR company_id = '';

-- Show distribution of modules across companies
SELECT '=== MODULES PER COMPANY ===' as info;
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(m.id) as module_count,
    STRING_AGG(m.title, ', ' ORDER BY m.title) as module_titles
FROM companies c
LEFT JOIN modules m ON m.company_id = c.id
GROUP BY c.id, c.name
ORDER BY module_count DESC;

-- Show final module status
SELECT '=== ALL MODULES (FINAL) ===' as info;
SELECT 
    id,
    title,
    company_id,
    type,
    created_at
FROM modules
ORDER BY company_id, created_at DESC;

-- ===============================================
-- SUCCESS CRITERIA
-- ===============================================
SELECT '=== SUCCESS CHECK ===' as info;
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SUCCESS: All modules have company_id'
        ELSE '❌ INCOMPLETE: ' || COUNT(*) || ' modules still need company_id'
    END as final_status
FROM modules
WHERE company_id IS NULL OR company_id = '';

