# 🚀 Fresh Supabase Setup Guide

Your project is ready to go with a fresh Supabase database!

## ✅ Setup Steps (5 minutes)

### 1. **Run the Database Schema**

1. Go to your Supabase Dashboard:
   `https://supabase.com/dashboard/project/fyrsrvcbeejakeeawshq/sql/new`

2. Copy the contents of `supabase-fresh-schema.sql`

3. Paste into the SQL Editor and click **Run**

4. You should see: "Success. No rows returned"

---

### 2. **Enable Email Authentication**

1. Go to: `https://supabase.com/dashboard/project/fyrsrvcbeejakeeawshq/auth/providers`

2. Enable **Email** provider (it should be enabled by default)

3. (Optional) Enable **Magic Links** for passwordless login

---

### 3. **Configure Redirect URLs**

1. Go to: `https://supabase.com/dashboard/project/fyrsrvcbeejakeeawshq/auth/url-configuration`

2. Set **Site URL**: `http://localhost:3000`

3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000`

---

### 4. **Create Storage Bucket (for images)**

1. Go to: `https://supabase.com/dashboard/project/fyrsrvcbeejakeeawshq/storage/buckets`

2. Click **New Bucket**

3. Name: `quiz-images`

4. Make it **Public**: ✅

5. Click **Create Bucket**

6. Go to the bucket → **Policies** → Add these policies:

```sql
-- View policy
CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'quiz-images');

-- Upload policy
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quiz-images');

-- Delete policy
CREATE POLICY "Users can delete their images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quiz-images');
```

---

### 5. **Run the App**

```bash
pnpm dev
```

Visit: `http://localhost:3000`

---

## 👤 Create Your First Admin Account

### Step 1: Sign Up
1. Go to `http://localhost:3000/login`
2. Enter your email and password
3. Click **Sign up**
4. Check your email for confirmation (if email confirmation is enabled)

### Step 2: Get Your User ID
1. Go to Supabase Dashboard → Authentication → Users
2. Copy your **User ID** (UUID format)

### Step 3: Create a Company and Make Yourself Owner
Run this in the Supabase SQL Editor (replace `YOUR-USER-ID`):

```sql
-- Insert a company and set yourself as owner
INSERT INTO companies (id, name, owner_user_id)
VALUES ('my-company', 'My Company', 'YOUR-USER-ID-HERE');
```

### Step 4: Access Your Dashboard
Navigate to: `http://localhost:3000/dashboard/my-company`

You should now see the **admin view**! 🎉

---

## 📊 Database Schema Overview

Your database includes:

✅ **companies** - Organizations/workspaces
✅ **users** - Cache of auth users for faster lookups
✅ **modules** - Quiz/exam modules
✅ **exercises** - Questions within modules
✅ **alternatives** - Answer choices for exercises
✅ **results** - User exam submissions
✅ **exam_answers** - Individual answers for each result
✅ **exam_retakes** - Admin-granted retake permissions

All tables have **Row Level Security (RLS)** enabled for data protection!

---

## 🔒 Row Level Security (RLS)

Your database is secure:
- ✅ Users can only see their own results
- ✅ Company owners can manage their modules
- ✅ Company owners can view all results for their modules
- ✅ Anyone (authenticated) can take exams
- ✅ Storage is protected (authenticated uploads only)

---

## 🎨 Features Ready to Use

✅ User authentication (email/password + magic links)
✅ Protected routes (middleware)
✅ Admin vs Member views
✅ Create modules and exercises
✅ Add images and videos to questions
✅ Take quizzes and exams
✅ View results and analytics
✅ Grant exam retakes
✅ Lock/unlock exams

---

## 🧪 Test Everything

1. **Sign up** at `/login`
2. **Create a company** (via SQL)
3. **Make yourself owner** (via SQL)
4. **Access dashboard** at `/dashboard/my-company`
5. **Create a module** (Quiz or Exam)
6. **Add exercises** and alternatives
7. **Take the quiz/exam**
8. **View results**

---

## 🐛 Troubleshooting

### Can't log in?
- Check email auth is enabled
- Check redirect URLs are configured
- Check browser console for errors

### "Unauthorized" errors?
- Restart dev server after adding env vars
- Check service role key in `.env.local`

### Database errors?
- Make sure `supabase-fresh-schema.sql` ran successfully
- Check RLS policies aren't blocking your queries

---

**You're all set! Start building! 🚀**
