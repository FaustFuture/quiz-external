# Storage Bucket Setup Guide

This guide will help you set up the required Supabase storage buckets for logo uploads in your Quiz Platform.

## Required Storage Buckets

The application requires the following storage buckets:

1. **company-logos** - For storing company logo images
2. **images** - For storing general images (exercises, etc.)

## Setup Instructions

### Step 1: Access Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in to your account
3. Select your project

### Step 2: Navigate to Storage

1. In the left sidebar, click on **Storage**
2. You'll see a list of existing buckets (if any)

### Step 3: Create the "company-logos" Bucket

1. Click the **"New bucket"** button
2. Fill in the following details:
   - **Name**: `company-logos`
   - **Public bucket**: ✅ Enable (checked)
   - **File size limit**: `2MB` (or higher if needed)
   - **Allowed MIME types**: `image/*` (or specific types like `image/png, image/jpeg, image/jpg, image/gif, image/webp`)

3. Click **"Create bucket"**

### Step 4: Configure Bucket Policies

For the bucket to work properly, you need to set up the right policies:

#### Option A: Public Upload and Read (Recommended for Development)

1. Click on the **company-logos** bucket
2. Go to the **Policies** tab
3. Click **"New Policy"**
4. Add the following policies:

**Policy 1: Allow Public Read**
```sql
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');
```

**Policy 2: Allow Authenticated Upload**
```sql
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');
```

**Policy 3: Allow Service Role Full Access** (Already handled by admin client)
The admin client bypasses RLS, so no additional policy needed.

#### Option B: Use SQL Editor (Advanced)

Go to **SQL Editor** in Supabase and run:

```sql
-- Create the company-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-logos');
```

### Step 5: Verify Bucket Configuration

1. Go back to **Storage** → **company-logos**
2. Verify that:
   - The bucket is marked as **Public**
   - Policies are showing under the **Policies** tab
   - You can see the bucket in the list

### Step 6: Test the Upload

1. Go to your application's dashboard
2. Click on your company logo area (camera icon)
3. Select an image file (PNG, JPG, GIF, etc.) under 2MB
4. The upload should now work successfully!

## Troubleshooting

### Error: "Storage bucket 'company-logos' does not exist"

**Solution**: Follow Step 3 above to create the bucket.

### Error: "Storage permission denied"

**Solution**: 
- Check that the bucket policies are set up correctly (Step 4)
- Verify that your Supabase service role key is correctly set in `.env.local`
- Ensure the bucket is marked as **Public**

### Error: "Cannot connect to storage server"

**Solution**: 
- Check your internet connection
- Verify that your Supabase URL and keys are correct in `.env.local`
- Check if Supabase is having any service issues

### Error: "Storage quota exceeded"

**Solution**: 
- Check your Supabase project's storage usage
- Upgrade your Supabase plan if needed
- Delete old/unused files to free up space

### Files Upload But Don't Display

**Solution**:
- Ensure the bucket is marked as **Public**
- Check that CORS is properly configured (usually automatic for public buckets)
- Verify the public URL is being generated correctly

## Environment Variables

Make sure these are set in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Security Considerations

### For Production

For production environments, consider:

1. **Restrict upload size**: Set appropriate file size limits
2. **Validate file types**: Only allow specific image formats
3. **Implement rate limiting**: Prevent abuse of the upload endpoint
4. **Add authentication**: Ensure only authorized users can upload
5. **Scan for malware**: Consider using a file scanning service
6. **Use CDN**: Configure a CDN for better performance

### Recommended Policy for Production

```sql
-- Only allow company admins to upload logos
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
```

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Security Best Practices](https://supabase.com/docs/guides/storage/security/access-control)
- [Row Level Security (RLS) Policies](https://supabase.com/docs/guides/auth/row-level-security)

## Need Help?

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Check the Supabase project logs
3. Verify all environment variables are correctly set
4. Ensure your Supabase project is on a plan that includes storage

---

Last updated: {{ current_date }}

