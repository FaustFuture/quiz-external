-- Create guest_accounts table to store guest user information
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS guest_accounts (
  guest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups (optional, useful if you want to find guests by email)
CREATE INDEX IF NOT EXISTS idx_guest_accounts_email ON guest_accounts(email) WHERE email IS NOT NULL;

-- Create index on created_at for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_guest_accounts_created_at ON guest_accounts(created_at DESC);

-- Add comment to table
COMMENT ON TABLE guest_accounts IS 'Stores guest user information for quiz participants who do not have accounts';

