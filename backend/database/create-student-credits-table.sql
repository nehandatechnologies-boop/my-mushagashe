-- Student Credits Table
-- This table stores student-level credit that can be transferred between fees
-- Unlike fee-level prepayment, this credit belongs to the student, not a specific fee

CREATE TABLE IF NOT EXISTS student_credits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  original_payment_id INTEGER REFERENCES payment_history(id),
  allocated_to_fee_id INTEGER REFERENCES fees(id),
  allocation_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'available', -- 'available', 'allocated', 'partially_allocated'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_credits_user_id ON student_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_student_credits_status ON student_credits(status);
CREATE INDEX IF NOT EXISTS idx_student_credits_original_payment ON student_credits(original_payment_id);
CREATE INDEX IF NOT EXISTS idx_student_credits_allocated_fee ON student_credits(allocated_to_fee_id);

-- Enable Row Level Security
ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (backend handles auth)
CREATE POLICY "Enable all access for student_credits" ON student_credits FOR ALL USING (true) WITH CHECK (true);

-- Add comments to document the table
COMMENT ON TABLE student_credits IS 'Student-level credit that can be transferred between fees. Unlike fee-level prepayment, this credit belongs to the student and can be allocated to any fee.';
COMMENT ON COLUMN student_credits.amount IS 'Current available credit amount for this student';
COMMENT ON COLUMN student_credits.original_payment_id IS 'Reference to the original payment that created this credit for audit trail';
COMMENT ON COLUMN student_credits.allocated_to_fee_id IS 'When credit is allocated to a specific fee, this references that fee';
COMMENT ON COLUMN student_credits.allocation_amount IS 'Amount of credit that has been allocated to the fee';
COMMENT ON COLUMN student_credits.status IS 'available = not yet allocated, allocated = fully allocated to a fee, partially_allocated = some credit allocated but some remains';

-- Verify the table was created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'student_credits'
ORDER BY ordinal_position;
