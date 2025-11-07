-- Fix the module order constraint to be unique per company instead of globally
-- This will allow proper drag and drop reordering

-- First, drop the existing unique constraint
DROP INDEX IF EXISTS idx_modules_order_unique;

-- Create a new unique constraint that's scoped to company_id
-- This allows the same order number for different companies
CREATE UNIQUE INDEX idx_modules_company_order_unique ON modules(company_id, "order") WHERE "order" >= 0;

-- Add a comment to explain the change
COMMENT ON INDEX idx_modules_company_order_unique IS 'Ensures unique order per company, allowing drag and drop reordering within each company';
