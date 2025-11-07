-- Check RLS status for exam tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('results', 'exam_answers', 'exercises', 'alternatives', 'modules')
AND schemaname = 'public'
ORDER BY tablename;
