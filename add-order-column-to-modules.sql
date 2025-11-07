-- Add order column to modules table if it doesn't exist

-- Add the order column
ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Create index on order column for efficient sorting
CREATE INDEX IF NOT EXISTS idx_modules_order ON modules("order");

-- Add constraint to ensure order is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'modules_order_positive'
    ) THEN
        ALTER TABLE modules ADD CONSTRAINT modules_order_positive CHECK ("order" >= 0);
    END IF;
END $$;

-- Update existing modules to have sequential order based on created_at
WITH ranked_modules AS (
    SELECT 
        id, 
        ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at) - 1 AS new_order
    FROM modules
    WHERE "order" = 0
)
UPDATE modules m
SET "order" = rm.new_order
FROM ranked_modules rm
WHERE m.id = rm.id;

-- Add comment
COMMENT ON COLUMN modules."order" IS 'Display order of the module within its company';
