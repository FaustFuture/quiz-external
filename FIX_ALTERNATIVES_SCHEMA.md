# Fix for Alternatives Table Schema Issue

## Problem
The application is trying to insert data into a `content` column in the `alternatives` table, but the database has a `text` column instead. This causes the error:
```
"Could not find the 'content' column of 'alternatives' in the schema cache"
```

## Root Cause
There's a schema inconsistency between:
- `supabase-fresh-schema.sql` - Had `text` and `order_index` columns
- `supabase-schema.sql` - Has `content` and `order` columns (correct version)
- Application code (`app/actions/alternatives.ts`) - Uses `content` and `order` columns

## Solution

### Step 1: Run the Migration SQL
Execute the migration file to fix your database schema:

**File: `fix-alternatives-content-column.sql`**

This migration will:
1. Rename `text` column to `content` (if it exists)
2. Rename `order_index` column to `order` (if it exists)
3. Add `explanation` column (if missing)
4. Ensure all required columns exist with correct names

### Step 2: How to Run the Migration

#### Option A: Using Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `fix-alternatives-content-column.sql`
4. Paste and run the SQL

#### Option B: Using psql or any PostgreSQL client
```bash
psql your_database_connection_string -f fix-alternatives-content-column.sql
```

### Step 3: Verify the Fix
After running the migration, the `alternatives` table should have these columns:
- `id` (UUID, PRIMARY KEY)
- `exercise_id` (UUID, NOT NULL, FOREIGN KEY)
- `content` (TEXT, NOT NULL) ✅ Fixed
- `is_correct` (BOOLEAN)
- `explanation` (TEXT, nullable) ✅ Added
- `order` (INTEGER, NOT NULL) ✅ Fixed
- `image_url` (TEXT, nullable)
- `image_urls` (TEXT[], nullable)
- `created_at` (TIMESTAMPTZ)

## Additional Changes Made

### Updated Schema Files
- ✅ Fixed `supabase-fresh-schema.sql` to use correct column names
- The application code already uses the correct column names

### Schema Consistency
All schema files now consistently use:
- `content` instead of `text`
- `order` instead of `order_index`
- Include `explanation` column

## Testing
After running the migration:
1. Try creating a new alternative/option through the UI
2. The error should be resolved
3. The alternative should be created successfully

## Prevention
Going forward:
- Use `supabase-schema.sql` as the source of truth for schema
- Ensure all migration files use consistent column names
- Test schema changes in development before production
