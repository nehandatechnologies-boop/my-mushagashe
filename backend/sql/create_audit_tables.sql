-- Create audit_logs table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  resource_type	VARCHAR(50),
  resource_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_role ON audit_logs(user_role);

-- Create result_history table for tracking result changes
CREATE TABLE IF NOT EXISTS result_history (
  id SERIAL PRIMARY KEY,
  result_id INTEGER NOT NULL,
  changed_by INTEGER NOT NULL,
  changed_by_role VARCHAR(50),
  change_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE
  previous_data JSONB,
  new_data JSONB,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for result_history
CREATE INDEX IF NOT EXISTS idx_result_history_result_id ON result_history(result_id);
CREATE INDEX IF NOT EXISTS idx_result_history_changed_by ON result_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_result_history_created_at ON result_history(created_at DESC);

-- Create security_events table for tracking security-related events
CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  user_id INTEGER,
  user_role VARCHAR(50),
  ip_address VARCHAR(45),
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by INTEGER,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for security_events
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
