-- Fix Supabase Storage RLS for images bucket
-- Run these commands in your Supabase SQL Editor

-- 1. Disable RLS on the storage.objects table for the images bucket
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 2. Alternative: If you want to keep RLS but allow public access to images bucket
-- Create a policy that allows public access to the images bucket
CREATE POLICY "Public Access for images bucket" ON storage.objects
FOR ALL USING (bucket_id = 'images');

-- 3. If the above doesn't work, try this more permissive policy
CREATE POLICY "Allow all operations on images bucket" ON storage.objects
FOR ALL USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- 4. Make sure the images bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'images';

-- 5. If you want to completely disable RLS (less secure but simpler for development)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
