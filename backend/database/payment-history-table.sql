-- Payment History table to track individual payments
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  fee_id INTEGER NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_reference TEXT,
  payment_method TEXT,
  receipt_number TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_history_fee_id ON payment_history(fee_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);

-- Enable Row Level Security (RLS)
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we handle auth in backend)
CREATE POLICY "Enable all access for payment_history" ON payment_history FOR ALL USING (true) WITH CHECK (true);
