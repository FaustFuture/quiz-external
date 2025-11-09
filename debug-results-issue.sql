-- ===============================================
-- COMPREHENSIVE DIAGNOSTIC SCRIPT
-- ===============================================
-- This will help us identify exactly why results aren't showing
-- Run this in Supabase SQL Editor and share the output

-- ===============================================
-- 1. CHECK COMPANIES
-- ===============================================
SELECT 
    '=== COMPANIES ===' as section,
    id,
    name,
    owner_user_id,
    created_at
FROM companies
ORDER BY created_at DESC;

-- ===============================================
-- 2. CHECK MODULES AND THEIR COMPANY_ID
-- ===============================================
SELECT 
    '=== MODULES ===' as section,
    id,
    title,
    company_id,
    type,
    is_unlocked,
    created_at
FROM modules
ORDER BY created_at DESC;

-- Count modules by company_id status
SELECT 
    '=== MODULE COUNT BY STATUS ===' as section,
    CASE 
        WHEN company_id IS NULL THEN 'NULL company_id'
        WHEN company_id = '' THEN 'EMPTY company_id'
        ELSE company_id
    END as company_status,
    COUNT(*) as count
FROM modules
GROUP BY company_status
ORDER BY count DESC;

-- ===============================================
-- 3. CHECK RESULTS TABLE
-- ===============================================
SELECT 
    '=== RESULTS ===' as section,
    id,
    user_id,
    user_name,
    module_id,
    score,
    total_questions,
    correct_answers,
    submitted_at,
    created_at
FROM results
ORDER BY submitted_at DESC
LIMIT 20;

-- Count total results
SELECT 
    '=== TOTAL RESULTS ===' as section,
    COUNT(*) as total_results
FROM results;

-- ===============================================
-- 4. CHECK WHICH USERS BELONG TO WHICH COMPANIES
-- ===============================================
SELECT 
    '=== USER-COMPANY MEMBERSHIPS ===' as section,
    cu.user_id,
    cu.company_id,
    cu.role,
    c.name as company_name
FROM companies_users cu
LEFT JOIN companies c ON c.id = cu.company_id
ORDER BY cu.company_id, cu.role;

-- ===============================================
-- 5. TEST THE ACTUAL getRecentResults QUERY
-- ===============================================
-- Replace 'YOUR-COMPANY-ID' with your actual company ID

-- Step 1 of getRecentResults: Fetch modules for company
SELECT 
    '=== STEP 1: Modules for Company ===' as section,
    id, 
    title,
    company_id
FROM modules
WHERE company_id = 'test-company'  -- CHANGE THIS to your actual company ID
ORDER BY created_at DESC;

-- Step 2 of getRecentResults: Fetch results for those modules
WITH company_modules AS (
    SELECT id, title
    FROM modules
    WHERE company_id = 'test-company'  -- CHANGE THIS to your actual company ID
)
SELECT 
    '=== STEP 2: Results for Company Modules ===' as section,
    r.*,
    cm.title as module_title
FROM results r
INNER JOIN company_modules cm ON cm.id = r.module_id
ORDER BY r.submitted_at DESC
LIMIT 10;

-- ===============================================
-- 6. CHECK FOR DATA MISMATCH
-- ===============================================
-- Find results where module doesn't have company_id set
SELECT 
    '=== ORPHANED RESULTS ===' as section,
    r.id as result_id,
    r.user_name,
    r.module_id,
    m.title as module_title,
    m.company_id,
    r.score,
    r.submitted_at
FROM results r
LEFT JOIN modules m ON m.id = r.module_id
WHERE m.company_id IS NULL OR m.company_id = ''
ORDER BY r.submitted_at DESC;

-- ===============================================
-- 7. CHECK RELATIONSHIP INTEGRITY
-- ===============================================
-- Check if all results have valid module references
SELECT 
    '=== RESULT-MODULE INTEGRITY ===' as section,
    COUNT(CASE WHEN m.id IS NULL THEN 1 END) as results_with_missing_modules,
    COUNT(CASE WHEN m.id IS NOT NULL THEN 1 END) as results_with_valid_modules
FROM results r
LEFT JOIN modules m ON m.id = r.module_id;

-- ===============================================
-- 8. DETAILED TRACE FOR SPECIFIC COMPANY
-- ===============================================
-- Shows complete data flow for a specific company
-- Replace 'test-company' with your actual company ID

SELECT 
    '=== COMPLETE DATA TRACE ===' as section,
    c.id as company_id,
    c.name as company_name,
    COUNT(DISTINCT m.id) as module_count,
    COUNT(DISTINCT r.id) as result_count,
    COUNT(DISTINCT cu.user_id) as member_count,
    STRING_AGG(DISTINCT m.title, ', ') as module_titles
FROM companies c
LEFT JOIN modules m ON m.company_id = c.id
LEFT JOIN results r ON r.module_id = m.id
LEFT JOIN companies_users cu ON cu.company_id = c.id
WHERE c.id = 'test-company'  -- CHANGE THIS to your actual company ID
GROUP BY c.id, c.name;

-- ===============================================
-- SUCCESS INDICATORS
-- ===============================================
-- ✅ Modules should have non-null company_id
-- ✅ Results should exist in the database
-- ✅ The JOIN query (Step 2) should return results
-- ✅ "Orphaned results" should be 0
-- ✅ "Complete data trace" should show module_count > 0 and result_count > 0

