const supabase = require('../config/supabase');

async function createAuditLogsTable() {
  console.log('Creating audit_logs table...');

  try {
    // Create the table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50),
          entity_id INTEGER,
          details TEXT,
          metadata JSONB,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    if (tableError && tableError.code !== 'PGRST116') {
      console.error('Error creating table:', tableError);
      // Try direct SQL through the client
      console.log('Attempting direct table creation via SQL query...');
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);'
    ];

    for (const indexSql of indexes) {
      console.log(`Creating index...`);
      // Note: Supabase JS client doesn't support arbitrary SQL execution directly
      // This script is a placeholder - the actual SQL should be run via Supabase dashboard or psql
    }

    console.log('Note: Please run audit-logs-table.sql via Supabase dashboard or psql to create the table.');
    console.log('The SQL file is located at: backend/database/audit-logs-table.sql');

  } catch (error) {
    console.error('Error:', error);
  }
}

createAuditLogsTable();
