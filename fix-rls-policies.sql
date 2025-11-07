-- Fix for infinite recursion in companies_users RLS policies
-- Run this in Supabase SQL Editor

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can read company memberships" ON companies_users;
DROP POLICY IF EXISTS "Admins can manage memberships" ON companies_users;
DROP POLICY IF EXISTS "Admins can update memberships" ON companies_users;
DROP POLICY IF EXISTS "Admins can delete memberships" ON companies_users;

-- Create fixed policies without recursion
CREATE POLICY "Admins can update memberships"
  ON companies_users FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM companies_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete memberships"
  ON companies_users FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM companies_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
