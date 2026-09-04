-- Add auth_type column to users table for hybrid authentication
-- This allows tracking whether a user uses custom JWT or Supabase Auth

-- Add the column with default value 'custom' for existing users
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) DEFAULT 'custom';

-- Update any existing NULL values to 'custom'
UPDATE users SET auth_type = 'custom' WHERE auth_type IS NULL;

-- Add check constraint to ensure only valid values
ALTER TABLE users ADD CONSTRAINT check_auth_type 
  CHECK (auth_type IN ('custom', 'supabase'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_auth_type ON users(auth_type);

-- Verify the changes
SELECT 
  auth_type, 
  COUNT(*) as user_count 
FROM users 
GROUP BY auth_type;
