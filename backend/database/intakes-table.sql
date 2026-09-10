-- Intakes table for Mushagashe Vocational Training Centre
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS intakes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraint for status
ALTER TABLE intakes ADD CONSTRAINT check_intake_status 
  CHECK (status IN ('active', 'inactive', 'archived'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_intakes_year ON intakes(year);
CREATE INDEX IF NOT EXISTS idx_intakes_status ON intakes(status);

-- Enable RLS
ALTER TABLE intakes ENABLE ROW LEVEL SECURITY;

-- RLS policy (allow all access for now, backend handles auth)
CREATE POLICY "Enable all access for intakes" ON intakes FOR ALL USING (true) WITH CHECK (true);

-- Add intake column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS intake TEXT;

-- Create index for intake in users
CREATE INDEX IF NOT EXISTS idx_users_intake ON users(intake);

-- Verification queries
-- SELECT * FROM intakes ORDER BY year DESC, name;
-- SELECT intake, COUNT(*) FROM users GROUP BY intake;
