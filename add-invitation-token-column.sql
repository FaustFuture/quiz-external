-- Add invitation_token column to companies table
-- Run this in your Supabase SQL Editor

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS invitation_token TEXT;

-- Create index on invitation_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_companies_invitation_token 
ON companies(invitation_token) 
WHERE invitation_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN companies.invitation_token IS 'Permanent invitation token for company, used to generate shareable invitation links';

