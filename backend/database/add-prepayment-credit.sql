-- Add prepayment_credit field to fees table
-- This allows tracking payments that exceed the fee amount

-- Add the column with a default of 0 for existing records
ALTER TABLE fees
ADD COLUMN IF NOT EXISTS prepayment_credit NUMERIC(10,2) DEFAULT 0.0;

-- Add a comment to document the field
COMMENT ON COLUMN fees.prepayment_credit IS 'Amount paid above the fee amount, available as credit for future fees';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'fees' AND column_name = 'prepayment_credit';
