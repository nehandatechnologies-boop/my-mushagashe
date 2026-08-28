-- Create privacy_notices table for storing privacy policy versions
CREATE TABLE IF NOT EXISTS privacy_notices (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_current BOOLEAN DEFAULT false
);

-- Create index for current notice
CREATE INDEX IF NOT EXISTS idx_privacy_notices_current ON privacy_notices(is_current) WHERE is_current = true;

-- Create privacy_consents table for tracking user consent
CREATE TABLE IF NOT EXISTS privacy_consents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  notice_id INTEGER NOT NULL REFERENCES privacy_notices(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL, -- DATA_PROCESSING, MARKETING, COOKIES, etc.
  consented BOOLEAN NOT NULL,
  consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, notice_id, consent_type)
);

-- Create indexes for privacy_consents
CREATE INDEX IF NOT EXISTS idx_privacy_consents_user_id ON privacy_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_notice_id ON privacy_consents(notice_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_type ON privacy_consents(consent_type);

-- Create privacy_requests table for data subject rights requests
CREATE TABLE IF NOT EXISTS privacy_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  request_type VARCHAR(50) NOT NULL, -- ACCESS, DELETION, CORRECTION, PORTABILITY, OBJECTION
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, REJECTED
  description TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  processed_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for privacy_requests
CREATE INDEX IF NOT EXISTS idx_privacy_requests_user_id ON privacy_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_type ON privacy_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_created_at ON privacy_requests(created_at DESC);

-- Create data_retention_policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id SERIAL PRIMARY KEY,
  data_category VARCHAR(100) NOT NULL,
  retention_period_days INTEGER NOT NULL,
  retention_reason TEXT NOT NULL,
  legal_basis VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create processing_register table (ROPA - Record of Processing Activities)
CREATE TABLE IF NOT EXISTS processing_register (
  id SERIAL PRIMARY KEY,
  data_category VARCHAR(100) NOT NULL,
  purpose TEXT NOT NULL,
  data_subjects TEXT, -- Students, Staff, etc.
  recipients TEXT, -- Internal, External, etc.
  transfers TEXT, -- International transfers if any
  retention_period VARCHAR(100),
  security_measures TEXT,
  legal_basis VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create processor_register table (vendors/third parties)
CREATE TABLE IF NOT EXISTS processor_register (
  id SERIAL PRIMARY KEY,
  processor_name VARCHAR(255) NOT NULL,
  processor_type VARCHAR(100), -- Cloud Provider, Payment Processor, etc.
  services_provided TEXT NOT NULL,
  data_shared TEXT,
  data_location VARCHAR(255),
  security_measures TEXT,
  contract_expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dpia_records table (Data Protection Impact Assessment)
CREATE TABLE IF NOT EXISTS dpia_records (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  risk_level VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH
  risks_identified TEXT,
  mitigation_measures TEXT,
  assessment_date DATE,
  assessor_id INTEGER,
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for DPIA
CREATE INDEX IF NOT EXISTS idx_dpia_status ON dpia_records(status);
CREATE INDEX IF NOT EXISTS idx_dpia_risk_level ON dpia_records(risk_level);
