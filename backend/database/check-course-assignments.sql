-- Check students and their course assignments
SELECT 
  u.id,
  u.student_number,
  u.full_name,
  u.course_id,
  c.course_name,
  c.course_code
FROM users u
LEFT JOIN courses c ON u.course_id = c.id
WHERE u.role = 'student'
ORDER BY u.course_id NULLS LAST, u.full_name;

-- Count students per course
SELECT 
  c.id,
  c.course_code,
  c.course_name,
  COUNT(u.id) as actual_student_count
FROM courses c
LEFT JOIN users u ON c.id = u.course_id AND u.role = 'student'
GROUP BY c.id, c.course_code, c.course_name
ORDER BY c.course_name;

-- Check if any students have course_id but the course doesn't exist
SELECT 
  u.id,
  u.student_number,
  u.full_name,
  u.course_id
FROM users u
WHERE u.role = 'student' 
  AND u.course_id IS NOT NULL
  AND u.course_id NOT IN (SELECT id FROM courses);
