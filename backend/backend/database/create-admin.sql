-- Create default admin user for Mushagashe Vocational Training Centre
-- Run this in Supabase SQL Editor after creating the schema

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt, cost factor 10)
INSERT INTO users (
  full_name,
  email,
  password,
  role,
  status,
  created_at
) VALUES (
  'System Administrator',
  'admin@mushagashe.edu',
  '$2a$10$c90k/oP.5uwYeE18T/uHWetHzyO04/h2G.bw7qBgCjUovuGKFsqFa',
  'admin',
  'active',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify the admin user was created
SELECT id, full_name, email, role, status FROM users WHERE email = 'admin@mushagashe.edu';
