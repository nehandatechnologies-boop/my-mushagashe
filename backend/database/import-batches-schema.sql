-- Import Batches Schema for Mushagashe Vocational Training Centre
-- Run this in Supabase SQL Editor
-- This adds import batch tracking for student Excel imports

-- ============================================
-- IMPORT BATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS import_batches (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'preview', -- 'preview', 'processing', 'completed', 'failed'
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  is_current BOOLEAN NOT NULL DEFAULT FALSE, -- Whether this is the current active dataset
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- IMPORT BATCH DETAILS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS import_batch_details (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES import_batches(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  student_number TEXT NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'skipped', 'failed'
  row_number INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_import_batches_uploaded_by ON import_batches(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_is_current ON import_batches(is_current);
CREATE INDEX IF NOT EXISTS idx_import_batch_details_batch_id ON import_batch_details(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_batch_details_student_id ON import_batch_details(student_id);
CREATE INDEX IF NOT EXISTS idx_import_batch_details_student_number ON import_batch_details(student_number);

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batch_details ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================
-- Allow all access for now (backend handles auth)
CREATE POLICY "Enable all access for import_batches" ON import_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for import_batch_details" ON import_batch_details FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_import_batches_updated_at BEFORE UPDATE ON import_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View all import batches
-- SELECT * FROM import_batches ORDER BY uploaded_at DESC;

-- View current active batch
-- SELECT * FROM import_batches WHERE is_current = TRUE ORDER BY uploaded_at DESC LIMIT 1;

-- View batch details for a specific batch
-- SELECT * FROM import_batch_details WHERE batch_id = 1 ORDER BY row_number;

-- Count students per batch
-- SELECT batch_id, COUNT(*) as student_count
-- FROM import_batch_details
-- GROUP BY batch_id;
