-- Add a partial unique index on student_number for students only
-- This prevents duplicate student numbers while allowing non-students to have the same numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_number_unique
ON users (student_number)
WHERE role = 'student';

-- Verify the index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname = 'idx_users_student_number_unique';
