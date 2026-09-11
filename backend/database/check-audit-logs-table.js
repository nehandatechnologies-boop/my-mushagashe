const supabase = require('../config/supabase');

async function checkAuditLogsTable() {
  console.log('Checking if audit_logs table exists...');

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying audit_logs:', error);
      if (error.code === '42P01') {
        console.log('✗ audit_logs table does NOT exist');
      }
    } else {
      console.log('✓ audit_logs table exists');
      console.log(`  Sample data: ${data.length > 0 ? 'yes' : 'empty'}`);
    }
  } catch (e) {
    console.error('Exception:', e.message);
  }
}

checkAuditLogsTable();
