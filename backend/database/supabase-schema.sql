-- Supabase Database Schema for Mushagashe Vocational Training Centre
-- Run this in Supabase SQL Editor

-- Courses table (created first to avoid foreign key dependency issues)
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  course_code TEXT UNIQUE NOT NULL,
  course_name TEXT NOT NULL,
  department TEXT,
  duration INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  student_number TEXT UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  phone TEXT,
  gender TEXT,
  national_id TEXT,
  date_of_birth DATE,
  address TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  intake_year INTEGER,
  status TEXT DEFAULT 'active',
  profile_picture TEXT,
  course_id INTEGER REFERENCES courses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fees table
CREATE TABLE IF NOT EXISTS fees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  fee_category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  balance NUMERIC(10,2),
  payment_reference TEXT,
  payment_method TEXT,
  receipt_number TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Results table
CREATE TABLE IF NOT EXISTS results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_id INTEGER REFERENCES courses(id),
  semester TEXT,
  academic_year INTEGER,
  assessment_mark NUMERIC(5,2),
  exam_mark NUMERIC(5,2),
  final_mark NUMERIC(5,2),
  grade TEXT,
  credits INTEGER,
  lecturer TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_number ON users(student_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_course_id ON users(course_id);
CREATE INDEX IF NOT EXISTS idx_fees_user_id ON fees(user_id);
CREATE INDEX IF NOT EXISTS idx_fees_status ON fees(status);
CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_course_id ON results(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we handle auth in backend)
CREATE POLICY "Enable all access for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for courses" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for fees" ON fees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for results" ON results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for announcements" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
