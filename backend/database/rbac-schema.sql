-- RBAC Schema for Mushagashe Vocational Training Centre
-- Run this in Supabase SQL Editor
-- This adds role-based access control to the existing system

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'students', 'lecturers', 'courses', 'fees', 'admins'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROLE_PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================
-- Allow all access for now (backend handles auth)
CREATE POLICY "Enable all access for roles" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for permissions" ON permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for role_permissions" ON role_permissions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- INSERT DEFAULT ROLES
-- ============================================
INSERT INTO roles (name, description) VALUES
  ('SUPER_ADMIN', 'Full unrestricted system access'),
  ('ACADEMIC_ADMIN', 'Responsible for academic operations'),
  ('FINANCE_ADMIN', 'Responsible for all financial operations'),
  ('ADMISSIONS_ADMIN', 'Responsible for admissions and student records'),
  ('LECTURER_ADMIN', 'Controlled academic staff administration')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- INSERT PERMISSIONS BY CATEGORY
-- ============================================

-- Student Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('students.view', 'View student records', 'students'),
  ('students.create', 'Create new student accounts', 'students'),
  ('students.edit', 'Edit student information', 'students'),
  ('students.delete', 'Delete student accounts', 'students'),
  ('students.approve', 'Approve pending student accounts', 'students'),
  ('students.suspend', 'Suspend student accounts', 'students')
ON CONFLICT (name) DO NOTHING;

-- Lecturer Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('lecturers.view', 'View lecturer records', 'lecturers'),
  ('lecturers.create', 'Create new lecturer accounts', 'lecturers'),
  ('lecturers.edit', 'Edit lecturer information', 'lecturers'),
  ('lecturers.delete', 'Delete lecturer accounts', 'lecturers'),
  ('lecturers.suspend', 'Suspend lecturer accounts', 'lecturers')
ON CONFLICT (name) DO NOTHING;

-- Course Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('courses.view', 'View course information', 'courses'),
  ('courses.create', 'Create new courses', 'courses'),
  ('courses.edit', 'Edit course information', 'courses'),
  ('courses.delete', 'Delete courses', 'courses')
ON CONFLICT (name) DO NOTHING;

-- Subject Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('subjects.view', 'View subject information', 'subjects'),
  ('subjects.create', 'Create new subjects', 'subjects'),
  ('subjects.edit', 'Edit subject information', 'subjects'),
  ('subjects.delete', 'Delete subjects', 'subjects')
ON CONFLICT (name) DO NOTHING;

-- Result Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('results.view', 'View student results', 'results'),
  ('results.create', 'Create student results', 'results'),
  ('results.edit', 'Edit student results', 'results'),
  ('results.delete', 'Delete student results', 'results'),
  ('results.publish', 'Publish student results', 'results')
ON CONFLICT (name) DO NOTHING;

-- Fee Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('fees.view', 'View fee information', 'fees'),
  ('fees.create', 'Create fee records', 'fees'),
  ('fees.edit', 'Edit fee information', 'fees'),
  ('fees.delete', 'Delete fee records', 'fees')
ON CONFLICT (name) DO NOTHING;

-- Payment Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('payments.view', 'View payment records', 'payments'),
  ('payments.create', 'Create payment records', 'payments'),
  ('payments.edit', 'Edit payment records', 'payments'),
  ('payments.delete', 'Delete payment records', 'payments'),
  ('financial_reports.view', 'View financial reports', 'payments')
ON CONFLICT (name) DO NOTHING;

-- Announcement Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('announcements.view', 'View announcements', 'announcements'),
  ('announcements.create', 'Create announcements', 'announcements'),
  ('announcements.edit', 'Edit announcements', 'announcements'),
  ('announcements.delete', 'Delete announcements', 'announcements')
ON CONFLICT (name) DO NOTHING;

-- Intake Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('intakes.view', 'View intake information', 'intakes'),
  ('intakes.create', 'Create new intakes', 'intakes'),
  ('intakes.edit', 'Edit intake information', 'intakes'),
  ('intakes.delete', 'Delete intakes', 'intakes')
ON CONFLICT (name) DO NOTHING;

-- Admin Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('admins.view', 'View administrator accounts', 'admins'),
  ('admins.create', 'Create new administrator accounts', 'admins'),
  ('admins.edit', 'Edit administrator accounts', 'admins'),
  ('admins.suspend', 'Suspend administrator accounts', 'admins'),
  ('admins.delete', 'Delete administrator accounts', 'admins')
ON CONFLICT (name) DO NOTHING;

-- Audit Log Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('audit_logs.view', 'View audit logs', 'audit')
ON CONFLICT (name) DO NOTHING;

-- Settings Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('settings.view', 'View system settings', 'settings'),
  ('settings.edit', 'Edit system settings', 'settings')
ON CONFLICT (name) DO NOTHING;

-- Dashboard Permissions
INSERT INTO permissions (name, description, category) VALUES
  ('dashboard.view', 'View dashboard and statistics', 'dashboard')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ASSIGN PERMISSIONS TO SUPER_ADMIN (ALL PERMISSIONS)
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- ============================================
-- ASSIGN PERMISSIONS TO ACADEMIC_ADMIN
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ACADEMIC_ADMIN'
AND (
  p.category IN ('students', 'lecturers', 'courses', 'subjects', 'results', 'intakes', 'announcements')
  OR p.name = 'dashboard.view'
)
AND p.name IN (
  'dashboard.view',
  'students.view', 'students.create', 'students.edit', 'students.approve', 'students.suspend',
  'lecturers.view', 'lecturers.create', 'lecturers.edit',
  'courses.view', 'courses.create', 'courses.edit',
  'subjects.view', 'subjects.create', 'subjects.edit',
  'results.view', 'results.create', 'results.edit', 'results.publish',
  'intakes.view', 'intakes.create', 'intakes.edit',
  'announcements.view', 'announcements.create', 'announcements.edit'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- ASSIGN PERMISSIONS TO FINANCE_ADMIN
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'FINANCE_ADMIN'
AND p.name IN (
  'dashboard.view',
  'students.view',
  'fees.view', 'fees.create', 'fees.edit',
  'payments.view', 'payments.create', 'payments.edit',
  'financial_reports.view'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- ASSIGN PERMISSIONS TO ADMISSIONS_ADMIN
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMISSIONS_ADMIN'
AND p.name IN (
  'dashboard.view',
  'students.view', 'students.create', 'students.edit', 'students.approve', 'students.suspend',
  'intakes.view', 'intakes.create', 'intakes.edit',
  'announcements.view'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- ASSIGN PERMISSIONS TO LECTURER_ADMIN
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'LECTURER_ADMIN'
AND p.name IN (
  'dashboard.view',
  'students.view',
  'courses.view',
  'subjects.view',
  'results.view', 'results.create', 'results.edit'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- MIGRATE EXISTING ADMINS TO SUPER_ADMIN
-- ============================================
-- Update existing users with role 'admin' or 'super_admin' to reference the new role system
-- Note: We'll keep the role column in users for backward compatibility, but also add role_id
-- This migration will be done in a separate migration file to handle existing data safely

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View all roles
-- SELECT * FROM roles ORDER BY name;

-- View all permissions
-- SELECT * FROM permissions ORDER BY category, name;

-- View permissions for a specific role
-- SELECT p.name, p.description, p.category
-- FROM permissions p
-- JOIN role_permissions rp ON p.id = rp.permission_id
-- JOIN roles r ON rp.role_id = r.id
-- WHERE r.name = 'SUPER_ADMIN'
-- ORDER BY p.category, p.name;

-- Count permissions per role
-- SELECT r.name, COUNT(rp.permission_id) as permission_count
-- FROM roles r
-- LEFT JOIN role_permissions rp ON r.id = rp.role_id
-- GROUP BY r.id, r.name
-- ORDER BY r.name;
