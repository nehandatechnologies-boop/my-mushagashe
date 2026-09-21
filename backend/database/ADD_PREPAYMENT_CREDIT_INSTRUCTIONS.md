-- IMPORTANT: Run this SQL in your Supabase SQL Editor to add the prepayment_credit field
-- This script is safe to run - it uses IF NOT EXISTS to prevent errors if the column already exists

-- Add prepayment_credit field to fees table
ALTER TABLE fees
ADD COLUMN IF NOT EXISTS prepayment_credit NUMERIC(10,2) DEFAULT 0.0;

-- Add a comment to document the field
COMMENT ON COLUMN fees.prepayment_credit IS 'Amount paid above the fee amount, available as credit for future fees. Preserves actual payment amounts when payments exceed the fee amount.';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'fees' AND column_name = 'prepayment_credit';
