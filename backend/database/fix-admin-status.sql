-- Update admin user status to active
UPDATE users 
SET status = 'active' 
WHERE email = 'admin@mushagashe.edu';

-- Verify the update
SELECT id, full_name, email, role, status FROM users WHERE email = 'admin@mushagashe.edu';
