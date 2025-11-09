-- Supabase Storage Setup Script
-- Run this in your Supabase SQL Editor to set up storage buckets and policies

-- ============================================================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================================================

-- Create company-logos bucket (for company logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152, -- 2MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

-- Create images bucket (for general images like exercise images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];

-- ============================================================================
-- 2. STORAGE POLICIES FOR COMPANY-LOGOS BUCKET
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Only" ON storage.objects;

-- Policy: Allow public read access to company logos
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Policy: Allow authenticated users to upload company logos
-- Note: You can restrict this to admins only by adding a JOIN to companies_users
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Policy: Allow authenticated users to update company logos
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Policy: Allow authenticated users to delete company logos
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-logos');

-- ============================================================================
-- 3. STORAGE POLICIES FOR IMAGES BUCKET
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Images Read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Images Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Images Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Images Delete" ON storage.objects;

-- Policy: Allow public read access to images
CREATE POLICY "Public Images Read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Authenticated Images Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy: Allow authenticated users to update images
CREATE POLICY "Authenticated Images Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Policy: Allow authenticated users to delete images
CREATE POLICY "Authenticated Images Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');

-- ============================================================================
-- 4. OPTIONAL: RESTRICT COMPANY LOGO UPLOADS TO ADMINS ONLY
-- ============================================================================
-- Uncomment the section below if you want to restrict company logo uploads
-- to company admins only (more secure for production)

/*
-- Drop the general authenticated upload policy
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;

-- Create admin-only upload policy
CREATE POLICY "Admin Upload Only"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM companies_users
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
*/

-- ============================================================================
-- 5. VERIFY SETUP
-- ============================================================================

-- Check created buckets
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('company-logos', 'images');

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
AND (
  policyname LIKE '%company%'
  OR policyname LIKE '%Images%'
  OR policyname LIKE '%Public Read%'
  OR policyname LIKE '%Authenticated%'
);

-- ============================================================================
-- DONE!
-- ============================================================================
-- Your storage buckets and policies are now set up.
-- You can now upload company logos and images in your application.

