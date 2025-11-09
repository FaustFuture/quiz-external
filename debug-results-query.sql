-- Diagnostic Query: Check Results and Modules
-- Run this in your Supabase SQL Editor

-- 1. Check all modules and their company_ids
SELECT 
  'MODULES' as table_name,
  id, 
  title, 
  company_id,
  created_at
FROM modules
ORDER BY created_at DESC;

-- 2. Check all results and their module relationships
SELECT 
  'RESULTS' as table_name,
  r.id as result_id,
  r.user_name,
  r.score,
  r.module_id,
  m.title as module_title,
  m.company_id,
  r.submitted_at
FROM results r
LEFT JOIN modules m ON m.id = r.module_id
ORDER BY r.submitted_at DESC
LIMIT 20;

-- 3. Count results per module
SELECT 
  m.id as module_id,
  m.title as module_title,
  m.company_id,
  COUNT(r.id) as result_count
FROM modules m
LEFT JOIN results r ON r.module_id = m.id
GROUP BY m.id, m.title, m.company_id
ORDER BY result_count DESC;

-- 4. Check for orphaned results (results with no matching module)
SELECT 
  r.id,
  r.user_name,
  r.module_id as result_module_id,
  'NO MATCHING MODULE!' as status
FROM results r
LEFT JOIN modules m ON m.id = r.module_id
WHERE m.id IS NULL;

-- 5. Company-specific check (replace 'YOUR_COMPANY_ID' with your actual company ID)
-- Uncomment and replace with your company ID:
/*
SELECT 
  'Company Results' as info,
  m.title,
  COUNT(r.id) as results_count
FROM modules m
LEFT JOIN results r ON r.module_id = m.id
WHERE m.company_id = 'YOUR_COMPANY_ID'
GROUP BY m.id, m.title;
*/

