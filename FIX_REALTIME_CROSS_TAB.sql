-- ============================================
-- FIX: Realtime Cross-Tab Synchronization
-- ============================================
-- This script fixes the issue where realtime events
-- don't propagate across browser tabs
--
-- Issue: Test Scenario 2 failed - new quiz created in Tab 1
-- did not appear in Tab 0's sidebar filters
--
-- Root Cause: modules table missing REPLICA IDENTITY FULL
-- which is required for filtered realtime subscriptions
-- ============================================

-- Step 1: Check current replica identity setting
SELECT 
  schemaname, 
  tablename, 
  (SELECT relreplident FROM pg_class WHERE oid = (schemaname||'.'||tablename)::regclass) as replica_identity,
  CASE 
    WHEN (SELECT relreplident FROM pg_class WHERE oid = (schemaname||'.'||tablename)::regclass) = 'd' THEN 'DEFAULT (index-based)'
    WHEN (SELECT relreplident FROM pg_class WHERE oid = (schemaname||'.'||tablename)::regclass) = 'f' THEN 'FULL (all columns) ✅'
    WHEN (SELECT relreplident FROM pg_class WHERE oid = (schemaname||'.'||tablename)::regclass) = 'n' THEN 'NOTHING'
    ELSE 'UNKNOWN'
  END as replica_identity_description
FROM pg_tables 
WHERE tablename = 'modules';

-- Expected: replica_identity should be 'f' (FULL)
-- If it's 'd' (DEFAULT), you MUST run Step 2

-- Step 2: Set replica identity to FULL
-- ⚠️ CRITICAL FIX: This allows Realtime to work with row-level filters
ALTER TABLE modules REPLICA IDENTITY FULL;

-- Step 3: Verify the modules table is in the realtime publication
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'modules';

-- If Step 3 returns NO rows, run this:
-- ALTER PUBLICATION supabase_realtime ADD TABLE modules;

-- Step 4: Check RLS policies allow SELECT for authenticated users
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'modules'
ORDER BY cmd;

-- Step 5: Verify realtime is enabled for modules table
-- (This should show the table if realtime is enabled in Dashboard)
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public';

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Check if RLS is enabled (should be true)
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'modules';

-- Check current module count
SELECT COUNT(*) as total_modules FROM modules;

-- ============================================
-- TESTING INSTRUCTIONS
-- ============================================
-- 
-- After running this script:
-- 
-- 1. Restart your Next.js development server:
--    npm run dev
--
-- 2. Open the application in TWO browser tabs
--
-- 3. Tab 1: Create a new quiz
--    Expected console logs in Tab 1:
--    ✅ [ResultsSidebar] Real-time change received: {eventType: 'INSERT', ...}
--    ✅ [ResultsSidebar] Module added: Your Quiz Name
--
-- 4. Tab 2: Check console (WITHOUT REFRESHING)
--    Expected console logs in Tab 2:
--    ✅ [ResultsSidebar] Real-time change received: {eventType: 'INSERT', ...}
--    ✅ [ResultsSidebar] Module added: Your Quiz Name
--
-- 5. Tab 2: Open sidebar filters
--    Expected result:
--    ✅ New quiz appears in the dropdown WITHOUT manual refresh
--
-- ============================================
-- TROUBLESHOOTING
-- ============================================
--
-- If it still doesn't work after running this script:
--
-- 1. Check browser console for authentication errors:
--    Look for: [ResultsSidebar] Not authenticated
--
-- 2. Verify subscription status in both tabs:
--    Should see: [ResultsSidebar] ✅ Successfully subscribed
--
-- 3. Check for CHANNEL_ERROR or TIMED_OUT:
--    These indicate connection issues
--
-- 4. Verify the Realtime toggle is ON in Supabase Dashboard:
--    Dashboard → Database → Replication → modules table
--
-- 5. Check for RLS policy issues:
--    The authenticated user MUST have SELECT permission
--
-- ============================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Replica identity fix applied!';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '1. Restart your Next.js dev server';
  RAISE NOTICE '2. Test with two browser tabs';
  RAISE NOTICE '3. Check console logs for realtime events';
END $$;

