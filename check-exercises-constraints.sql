-- Diagnostic SQL to check the exercises table constraints
-- Run this in Supabase SQL Editor to see what constraints exist

-- Check if exercises table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'exercises'
ORDER BY ordinal_position;

-- Check primary key constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'exercises'
    AND tc.constraint_type = 'PRIMARY KEY';

-- Check all constraints on exercises table
SELECT
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'exercises';

-- If exercises table doesn't have a primary key, run this:
-- ALTER TABLE exercises ADD PRIMARY KEY (id);

-- If id column doesn't exist or isn't UUID, you may need to recreate the table
-- or add the id column with proper type

