-- IMPORTANT: Run this SQL in your Supabase SQL Editor to add payment breakdown fields
-- This script is safe to run - it uses IF NOT EXISTS to prevent errors if columns already exist

-- Add amount_applied_to_fee field to payment_history table
ALTER TABLE payment_history
ADD COLUMN IF NOT EXISTS amount_applied_to_fee NUMERIC(10,2) DEFAULT 0.0;

-- Add prepayment_amount field to payment_history table
ALTER TABLE payment_history
ADD COLUMN IF NOT EXISTS prepayment_amount NUMERIC(10,2) DEFAULT 0.0;

-- Add comments to document the fields
COMMENT ON COLUMN payment_history.amount_applied_to_fee IS 'Portion of the payment that was applied to the current fee amount';
COMMENT ON COLUMN payment_history.prepayment_amount IS 'Portion of the payment that exceeded the current fee amount, recorded as prepayment credit';

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'payment_history' AND column_name IN ('amount_applied_to_fee', 'prepayment_amount');
