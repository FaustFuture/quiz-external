-- Fix Existing Modules Company ID (Dynamic Solution)
-- This handles modules that were created before the company system was properly set up

-- Step 1: Check current state
SELECT 
  'Current State' as info,
  id, 
  title, 
  company_id,
  created_at
FROM modules
ORDER BY created_at DESC;

-- Step 2: Find modules with NULL or incorrect company_id
SELECT 
  'Problematic Modules' as info,
  COUNT(*) as count,
  company_id
FROM modules
GROUP BY company_id;

-- Step 3: Check what companies exist in your system
SELECT 
  'Available Companies' as info,
  id as company_id,
  name,
  owner_user_id
FROM companies
ORDER BY created_at DESC;

-- =====================================================
-- FIX OPTION 1: If you have ONE company in your system
-- =====================================================
-- This will set all modules to the first/only company

DO $$
DECLARE
  target_company_id TEXT;
BEGIN
  -- Get the first company ID (or the only one if there's just one)
  SELECT id INTO target_company_id 
  FROM companies 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Update all modules that don't have the correct company_id
  UPDATE modules
  SET company_id = target_company_id
  WHERE company_id IS NULL 
     OR company_id != target_company_id;
  
  RAISE NOTICE 'Updated modules to company_id: %', target_company_id;
END $$;

-- =====================================================
-- FIX OPTION 2: If you have MULTIPLE companies
-- =====================================================
-- This requires manual assignment based on module ownership
-- Replace 'YOUR_COMPANY_ID' with the actual company ID for each set of modules

/*
-- Example: Assign specific modules to specific companies

-- Assign modules by title pattern
UPDATE modules 
SET company_id = 'company-a'
WHERE title LIKE '%CompanyA%' AND company_id IS NULL;

UPDATE modules 
SET company_id = 'company-b'
WHERE title LIKE '%CompanyB%' AND company_id IS NULL;

-- OR assign modules by creation date
UPDATE modules 
SET company_id = 'company-a'
WHERE created_at < '2024-01-01' AND company_id IS NULL;

UPDATE modules 
SET company_id = 'company-b'
WHERE created_at >= '2024-01-01' AND company_id IS NULL;
*/

-- =====================================================
-- FIX OPTION 3: If URL shows 'test-company' but no such company exists
-- =====================================================
-- Create the 'test-company' entry if it doesn't exist

DO $$
BEGIN
  -- Check if 'test-company' exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = 'test-company') THEN
    INSERT INTO companies (id, name, owner_user_id)
    SELECT 
      'test-company',
      'Test Company',
      (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1); -- Use first user as owner
    
    RAISE NOTICE 'Created test-company';
  END IF;
  
  -- Now assign all modules to test-company
  UPDATE modules
  SET company_id = 'test-company'
  WHERE company_id IS NULL OR company_id = '';
  
  RAISE NOTICE 'Assigned modules to test-company';
END $$;

-- =====================================================
-- VERIFICATION: Check the fix worked
-- =====================================================

-- 1. Verify all modules now have a company_id
SELECT 
  'After Fix - Modules' as info,
  id,
  title,
  company_id
FROM modules
ORDER BY created_at DESC;

-- 2. Verify no orphaned modules
SELECT 
  'Orphaned Modules' as info,
  COUNT(*) as count
FROM modules
WHERE company_id IS NULL;

-- 3. Verify modules are linked to valid companies
SELECT 
  'Modules per Company' as info,
  c.name as company_name,
  c.id as company_id,
  COUNT(m.id) as module_count
FROM companies c
LEFT JOIN modules m ON m.company_id = c.id
GROUP BY c.id, c.name
ORDER BY module_count DESC;

-- =====================================================
-- PREVENT FUTURE ISSUES: Add constraint
-- =====================================================

-- Ensure company_id is always set (make it NOT NULL)
-- WARNING: Only run this AFTER fixing existing modules
/*
ALTER TABLE modules 
ALTER COLUMN company_id SET NOT NULL;
*/

