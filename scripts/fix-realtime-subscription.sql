-- Fix Realtime Subscription Issues for modules table
-- Run this in your Supabase SQL Editor

-- Step 1: Check current replica identity
SELECT 
  schemaname, 
  tablename, 
  (SELECT relreplident FROM pg_class WHERE oid = (schemaname||'.'||tablename)::regclass) as replica_identity
FROM pg_tables 
WHERE tablename = 'modules';

-- Step 2: Set replica identity to FULL (required for Realtime with filters)
-- This allows Realtime to work with row-level filters like company_id
ALTER TABLE modules REPLICA IDENTITY FULL;

-- Step 3: Verify the modules table is in the realtime publication
SELECT 
  tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'modules';

-- If Step 3 returns no rows, add the table to the publication:
-- ALTER PUBLICATION supabase_realtime ADD TABLE modules;

-- Step 4: Check RLS policies (should allow authenticated users to SELECT)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'modules';

-- Step 5: If no RLS policies exist or they're too restrictive, create a basic SELECT policy
-- Uncomment and modify if needed:
-- CREATE POLICY "Allow authenticated users to read modules" 
-- ON modules 
-- FOR SELECT 
-- TO authenticated 
-- USING (true);

-- Step 6: Verify the table has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'modules';

-- Success! If all steps pass, Realtime should now work.

