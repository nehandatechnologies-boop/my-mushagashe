const supabase = require('./config/supabase');

async function addPrepaymentCreditColumn() {
  console.log('Adding prepayment_credit column to fees table...');

  try {
    // Check if column already exists
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'fees')
      .eq('column_name', 'prepayment_credit');

    if (checkError) {
      console.error('Error checking column:', checkError);
      return;
    }

    if (columns && columns.length > 0) {
      console.log('Column prepayment_credit already exists');
      return;
    }

    // Add the column using SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE fees ADD COLUMN prepayment_credit NUMERIC(10,2) DEFAULT 0.0;'
    });

    if (error) {
      console.error('Error adding column:', error);
      return;
    }

    console.log('Successfully added prepayment_credit column to fees table');
  } catch (error) {
    console.error('Error:', error);
  }
}

addPrepaymentCreditColumn();
