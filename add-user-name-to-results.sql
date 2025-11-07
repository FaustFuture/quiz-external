-- Add user_name column to results table
ALTER TABLE results ADD COLUMN user_name TEXT;

-- Update existing records with a placeholder (optional)
-- UPDATE results SET user_name = 'User ' || SUBSTRING(user_id, 1, 8) WHERE user_name IS NULL;
