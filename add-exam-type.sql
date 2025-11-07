-- Add exam type to modules table
ALTER TABLE modules ADD COLUMN type TEXT DEFAULT 'module' CHECK (type IN ('module', 'exam'));
ALTER TABLE modules ADD COLUMN is_unlocked BOOLEAN DEFAULT FALSE;

-- Add index for type queries
CREATE INDEX idx_modules_type ON modules(type);
CREATE INDEX idx_modules_is_unlocked ON modules(is_unlocked);
