-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Insert granular permissions
INSERT INTO permissions (name, description, category) VALUES
-- Student management
('VIEW_STUDENT', 'View student information', 'STUDENT'),
('EDIT_STUDENT', 'Edit student information', 'STUDENT'),
('DELETE_STUDENT', 'Delete student records', 'STUDENT'),
('CREATE_STUDENT', 'Create new student records', 'STUDENT'),

-- Result management
('VIEW_RESULTS', 'View academic results', 'RESULT'),
('EDIT_RESULTS', 'Edit academic results', 'RESULT'),
('APPROVE_RESULTS', 'Approve academic results', 'RESULT'),
('CREATE_RESULTS', 'Create academic results', 'RESULT'),
('DELETE_RESULTS', 'Delete academic results', 'RESULT'),

-- Fee management
('VIEW_FEES', 'View fee information', 'FEE'),
('EDIT_FEES', 'Edit fee records', 'FEE'),
('CREATE_FEES', 'Create fee records', 'FEE'),
('DELETE_FEES', 'Delete fee records', 'FEE'),
('RECORD_PAYMENTS', 'Record fee payments', 'FEE'),
('VIEW_FINANCIAL_REPORTS', 'View financial reports', 'FEE'),

-- User management
('MANAGE_USERS', 'Manage user accounts', 'USER'),
('CHANGE_ROLES', 'Change user roles', 'USER'),
('RESET_PASSWORDS', 'Reset user passwords', 'USER'),
('DISABLE_ACCOUNTS', 'Disable user accounts', 'USER'),

-- Content management
('MANAGE_ANNOUNCEMENTS', 'Manage announcements', 'CONTENT'),
('MANAGE_COURSES', 'Manage courses', 'CONTENT'),
('MANAGE_SUBJECTS', 'Manage subjects', 'CONTENT'),

-- Document management
('VIEW_DOCUMENTS', 'View documents', 'DOCUMENT'),
('MANAGE_DOCUMENTS', 'Manage documents', 'DOCUMENT'),
('UPLOAD_DOCUMENTS', 'Upload documents', 'DOCUMENT'),
('DELETE_DOCUMENTS', 'Delete documents', 'DOCUMENT'),

-- Privacy and compliance
('VIEW_AUDIT_LOGS', 'View audit logs', 'COMPLIANCE'),
('MANAGE_PRIVACY_REQUESTS', 'Manage privacy requests', 'COMPLIANCE'),
('MANAGE_DATA_RETENTION', 'Manage data retention policies', 'COMPLIANCE'),
('VIEW_SECURITY_EVENTS', 'View security events', 'COMPLIANCE'),
('MANAGE_SYSTEM_SETTINGS', 'Manage system settings', 'COMPLIANCE'),

-- Data export
('EXPORT_DATA', 'Export data', 'DATA'),

-- Profile management
('EDIT_OWN_PROFILE', 'Edit own profile', 'PROFILE'),
('VIEW_OWN_RESULTS', 'View own results', 'PROFILE'),
('VIEW_OWN_FEES', 'View own fees', 'PROFILE')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to SUPER_ADMIN (all permissions)
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign permissions to ADMIN
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions 
WHERE name IN (
  'VIEW_STUDENT', 'EDIT_STUDENT', 'DELETE_STUDENT', 'CREATE_STUDENT',
  'VIEW_RESULTS', 'EDIT_RESULTS', 'APPROVE_RESULTS', 'CREATE_RESULTS', 'DELETE_RESULTS',
  'VIEW_FEES', 'EDIT_FEES', 'CREATE_FEES', 'DELETE_FEES', 'RECORD_PAYMENTS', 'VIEW_FINANCIAL_REPORTS',
  'MANAGE_USERS', 'CHANGE_ROLES', 'RESET_PASSWORDS', 'DISABLE_ACCOUNTS',
  'MANAGE_ANNOUNCEMENTS', 'MANAGE_COURSES', 'MANAGE_SUBJECTS',
  'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS', 'UPLOAD_DOCUMENTS', 'DELETE_DOCUMENTS',
  'VIEW_AUDIT_LOGS', 'MANAGE_PRIVACY_REQUESTS', 'MANAGE_DATA_RETENTION', 'VIEW_SECURITY_EVENTS', 'MANAGE_SYSTEM_SETTINGS',
  'EXPORT_DATA'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign permissions to REGISTRAR
INSERT INTO role_permissions (role, permission_id)
SELECT 'registrar', id FROM permissions
WHERE name IN (
  'VIEW_STUDENT', 'EDIT_STUDENT', 'CREATE_STUDENT',
  'VIEW_RESULTS', 'APPROVE_RESULTS',
  'VIEW_FEES', 'VIEW_FINANCIAL_REPORTS',
  'MANAGE_COURSES',
  'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS',
  'VIEW_AUDIT_LOGS',
  'EXPORT_DATA'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign permissions to FINANCE
INSERT INTO role_permissions (role, permission_id)
SELECT 'finance', id FROM permissions
WHERE name IN (
  'VIEW_STUDENT',
  'VIEW_FEES', 'EDIT_FEES', 'CREATE_FEES', 'RECORD_PAYMENTS', 'VIEW_FINANCIAL_REPORTS',
  'VIEW_DOCUMENTS',
  'EXPORT_DATA'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign permissions to INSTRUCTOR (lecturer)
INSERT INTO role_permissions (role, permission_id)
SELECT 'instructor', id FROM permissions
WHERE name IN (
  'VIEW_STUDENT',
  'VIEW_RESULTS', 'EDIT_RESULTS', 'CREATE_RESULTS',
  'MANAGE_SUBJECTS',
  'VIEW_DOCUMENTS'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign permissions to STUDENT
INSERT INTO role_permissions (role, permission_id)
SELECT 'student', id FROM permissions
WHERE name IN (
  'EDIT_OWN_PROFILE',
  'VIEW_OWN_RESULTS',
  'VIEW_OWN_FEES',
  'VIEW_DOCUMENTS'
)
ON CONFLICT (role, permission_id) DO NOTHING;
