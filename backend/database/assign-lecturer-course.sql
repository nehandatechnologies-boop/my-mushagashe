-- Assign a course to a lecturer
-- Replace 'lecturer_email@example.com' with the actual lecturer email
-- Replace '1' with the actual course ID

-- First, check available courses
SELECT id, course_code, course_name FROM courses ORDER BY course_name;

-- Then, check current lecturer assignments
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.course_id,
  c.course_name
FROM users u
LEFT JOIN courses c ON u.course_id = c.id
WHERE u.role = 'lecturer';

-- Assign course to lecturer (replace values as needed)
-- UPDATE users 
-- SET course_id = 1 
-- WHERE email = 'lecturer_email@example.com' AND role = 'lecturer';

-- Verify the assignment
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.course_id,
  c.course_name,
  c.course_code
FROM users u
LEFT JOIN courses c ON u.course_id = c.id
WHERE u.role = 'lecturer';
