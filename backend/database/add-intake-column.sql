-- Add intake column to users table for proper cohort tracking
-- This allows storing "January 2026", "May 2026", "September 2026" instead of just year

-- Add the new intake column as TEXT
ALTER TABLE users ADD COLUMN IF NOT EXISTS intake TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_intake ON users(intake);

-- Note: We keep intake_year for backward compatibility
-- Existing data will be migrated gradually as students are updated
-- New registrations will use the intake field

-- Verify the changes
SELECT 
  intake_year, 
  intake, 
  COUNT(*) as user_count 
FROM users 
GROUP BY intake_year, intake;
